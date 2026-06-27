import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeCategoryGoals } from "@/lib/hammer/goals/categoryGoals";

/**
 * Read-only derivation of athlete first-run state.
 *
 * Tightened (Phase: injury+onboarding closure) so that the *bootstrap*
 * event emitted on mount (`relational.developmental.age_observed`)
 * doesn't trick the gate into thinking the athlete has finished the
 * flow. The flow is only considered "started" when the athlete has
 * personally emitted the schedule day-type event, and only "complete"
 * when schedule, notifications pref, AND a complete ranked-goal list all exist.
 *
 * No writes. No fabrication.
 */
export interface OnboardingState {
  hasProfile: boolean;
  /** ≥1 asb_events row of ANY kind (incl. bootstrap). Legacy field, kept for back-compat. */
  hasFirstEvent: boolean;
  /** Athlete-emitted the schedule day-type event — the real "started" signal. */
  hasScheduleEvent: boolean;
  hasNotificationsPref: boolean;
  /** Per-category ranked goals saved (all five categories ranked 1..5). */
  hasCategoryGoals: boolean;
  /** True when schedule + notif + ranked goals all present — used by Profile / sidebar gating. */
  hasCompletedOnboarding: boolean;
  loading: boolean;
}

export function useAthleteOnboardingState() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const q = useQuery({
    queryKey: ["athlete-onboarding-state", uid],
    enabled: !!uid,
    staleTime: 15_000,
    queryFn: async () => {
      const [profile, anyEvent, scheduleEvent, pref, ctx] = await Promise.all([
        supabase.from("profiles").select("id").eq("id", uid!).maybeSingle(),
        supabase
          .from("asb_events")
          .select("event_id", { count: "exact", head: true })
          .eq("athlete_id", uid!),
        supabase
          .from("asb_events")
          .select("event_id", { count: "exact", head: true })
          .eq("athlete_id", uid!)
          .eq("topic_id", "athlete.schedule.day_type"),
        supabase
          .from("notification_preferences" as never)
          .select("user_id")
          .eq("user_id", uid!)
          .maybeSingle(),
        supabase
          .from("athlete_context")
          .select("category_goals")
          .eq("user_id", uid!)
          .maybeSingle(),
      ]);
      const hasSchedule = (scheduleEvent.count ?? 0) > 0;
      const hasPref = !!(pref as { data?: unknown }).data;
      const goalsRaw = (ctx.data as { category_goals?: unknown } | null)?.category_goals;
      const hasGoals = !!normalizeCategoryGoals(goalsRaw);
      return {
        hasProfile: !!profile.data,
        hasFirstEvent: (anyEvent.count ?? 0) > 0,
        hasScheduleEvent: hasSchedule,
        hasNotificationsPref: hasPref,
        hasCategoryGoals: hasGoals,
        hasCompletedOnboarding: hasSchedule && hasPref && hasGoals,
      };
    },
  });

  return {
    hasProfile: q.data?.hasProfile ?? false,
    hasFirstEvent: q.data?.hasFirstEvent ?? false,
    hasScheduleEvent: q.data?.hasScheduleEvent ?? false,
    hasNotificationsPref: q.data?.hasNotificationsPref ?? false,
    hasCategoryGoals: q.data?.hasCategoryGoals ?? false,
    hasCompletedOnboarding: q.data?.hasCompletedOnboarding ?? false,
    loading: q.isLoading,
  } satisfies OnboardingState;
}
