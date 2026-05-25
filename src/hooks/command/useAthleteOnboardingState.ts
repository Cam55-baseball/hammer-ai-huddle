import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Read-only derivation of athlete first-run state.
 * - hasProfile: profile row exists
 * - hasFirstEvent: ≥1 canonical asb_events row ever (athlete actor)
 * - hasNotificationsPref: opted in/out of notifications (row exists)
 *
 * No writes. No fabrication.
 */
export interface OnboardingState {
  hasProfile: boolean;
  hasFirstEvent: boolean;
  hasNotificationsPref: boolean;
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
      const [profile, eventCount, pref] = await Promise.all([
        supabase.from("profiles").select("id").eq("id", uid!).maybeSingle(),
        supabase
          .from("asb_events")
          .select("event_id", { count: "exact", head: true })
          .eq("athlete_id", uid!),
        supabase
          .from("notification_preferences" as never)
          .select("user_id")
          .eq("user_id", uid!)
          .maybeSingle(),
      ]);
      return {
        hasProfile: !!profile.data,
        hasFirstEvent: (eventCount.count ?? 0) > 0,
        hasNotificationsPref: !!(pref as { data?: unknown }).data,
      };
    },
  });

  return {
    hasProfile: q.data?.hasProfile ?? false,
    hasFirstEvent: q.data?.hasFirstEvent ?? false,
    hasNotificationsPref: q.data?.hasNotificationsPref ?? false,
    loading: q.isLoading,
  } satisfies OnboardingState;
}
