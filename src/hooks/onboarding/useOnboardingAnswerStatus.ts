/**
 * useOnboardingAnswerStatus — read-only derivation of *which onboarding
 * questions the athlete has actually answered*.
 *
 * Positional progress ("I clicked past step 4") is NOT an answer. This hook
 * composes the canonical persisted surfaces:
 *   - profiles (date_of_birth, throwing_hand)
 *   - athlete_context (anthropometrics, category_goals, onboarding_draft)
 *   - local draft bag (offline-warm cache of the same draft slots)
 *   - useAthleteOnboardingState (schedule event, notification prefs, goals)
 *
 * Missing data always reads as "open". Nothing is inferred or fabricated.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { readDraftBagLocal, type DraftSlot } from "@/lib/onboarding/draftStore";

export type StepAnswerStatus = "answered" | "open" | "neutral";

/** Step keys this hook can decide on. Everything else is navigation-only. */
export type AnswerableStepKey =
  | "profile"
  | "anthropometrics"
  | "equipment"
  | "goals"
  | "fuel"
  | "mental"
  | "connections"
  | "schedule"
  | "injury"
  | "notifications";

export interface OnboardingAnswerStatus {
  /** Per-answerable-step status. */
  byKey: Record<AnswerableStepKey, StepAnswerStatus>;
  answeredCount: number;
  totalAnswerable: number;
  loading: boolean;
}

const EMPTY: Record<AnswerableStepKey, StepAnswerStatus> = {
  profile: "open",
  anthropometrics: "open",
  equipment: "open",
  goals: "open",
  fuel: "open",
  mental: "open",
  connections: "open",
  schedule: "open",
  injury: "open",
  notifications: "open",
};

function hasAnyValue(o: unknown): boolean {
  if (!o || typeof o !== "object") return false;
  return Object.values(o as Record<string, unknown>).some(
    (v) => v !== null && v !== undefined && v !== "" && v !== false,
  );
}

export function useOnboardingAnswerStatus(): OnboardingAnswerStatus {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { hasScheduleEvent, hasNotificationsPref, hasCategoryGoals, loading: stateLoading } =
    useAthleteOnboardingState();

  const q = useQuery({
    queryKey: ["onboarding-answer-status", uid],
    enabled: !!uid,
    staleTime: 10_000,
    queryFn: async () => {
      const [profile, ctx, equip] = await Promise.all([
        supabase
          .from("profiles")
          .select("date_of_birth, throwing_hand")
          .eq("id", uid!)
          .maybeSingle(),
        supabase
          .from("athlete_context")
          .select("anthropometrics, onboarding_draft")
          .eq("user_id", uid!)
          .maybeSingle(),
        supabase
          .from("athlete_equipment_context")
          .select("equipment")
          .eq("user_id", uid!)
          .eq("scope", "persistent")
          .maybeSingle(),
      ]);
      const p = (profile.data ?? null) as
        | { date_of_birth?: string | null; throwing_hand?: string | null }
        | null;
      const c = (ctx.data ?? null) as
        | { anthropometrics?: unknown; onboarding_draft?: Record<string, unknown> | null }
        | null;
      return {
        dob: p?.date_of_birth ?? null,
        throwingHand: p?.throwing_hand ?? null,
        anthropometrics: c?.anthropometrics ?? null,
        remoteDraft: (c?.onboarding_draft ?? {}) as Partial<Record<DraftSlot, unknown>>,
        equipment: ((equip.data as { equipment?: string[] } | null)?.equipment ?? []) as string[],
      };
    },
  });

  const localDraft = uid ? readDraftBagLocal(uid) : {};
  const remoteDraft = q.data?.remoteDraft ?? {};
  const slot = (s: DraftSlot): unknown =>
    localDraft[s] !== undefined ? localDraft[s] : remoteDraft[s];

  const byKey: Record<AnswerableStepKey, StepAnswerStatus> = { ...EMPTY };

  const profileDraft = slot("profile-answers") as { throwingHand?: string } | undefined;
  byKey.profile =
    q.data?.throwingHand || profileDraft?.throwingHand ? "answered" : "open";

  byKey.anthropometrics =
    hasAnyValue(q.data?.anthropometrics) || hasAnyValue(slot("anthropometrics"))
      ? "answered"
      : "open";

  byKey.equipment = (q.data?.equipment?.length ?? 0) > 0 ? "answered" : "open";
  byKey.goals = hasCategoryGoals ? "answered" : "open";
  byKey.fuel = hasAnyValue(slot("fuel-recovery")) ? "answered" : "open";
  byKey.mental = hasAnyValue(slot("mental-career")) ? "answered" : "open";
  byKey.connections = hasAnyValue(slot("connections")) ? "answered" : "open";
  byKey.schedule = hasScheduleEvent ? "answered" : "open";
  byKey.injury = hasAnyValue(slot("injury-intake")) ? "answered" : "open";
  byKey.notifications = hasNotificationsPref ? "answered" : "open";

  const values = Object.values(byKey);
  return {
    byKey,
    answeredCount: values.filter((v) => v === "answered").length,
    totalAnswerable: values.length,
    loading: stateLoading || q.isLoading,
  };
}
