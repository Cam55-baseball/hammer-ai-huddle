/**
 * useStaffOnboardingState — first-run completion state for scouts and coaches.
 *
 * Completion is DERIVED (never a stored boolean flag), mirroring the athlete
 * model: a staff member has finished first-run setup once their canonical
 * role context row exists with at least the identifying answers filled in.
 * Nothing is ever auto-filled on their behalf.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useScoutAccess } from "@/hooks/useScoutAccess";

export type StaffOnboardingRole = "scout" | "coach" | null;

export interface StaffOnboardingState {
  role: StaffOnboardingRole;
  /** Route to send this user to, or null when they're not staff. */
  onboardingPath: string | null;
  hasContextRow: boolean;
  hasCompletedOnboarding: boolean;
  loading: boolean;
  refetch: () => void;
}

export function useStaffOnboardingState(): StaffOnboardingState {
  const { user } = useAuth();
  const { isScout, isCoach, loading: roleLoading } = useScoutAccess();

  // A user holding both roles is treated as a scout for first-run purposes;
  // they can complete the coach flow afterwards from Settings.
  const role: StaffOnboardingRole = isScout ? "scout" : isCoach ? "coach" : null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["staff-onboarding-state", user?.id, role],
    enabled: !!user?.id && !!role && !roleLoading,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id || !role) return { hasContextRow: false, complete: false };

      // Completion is an EXPLICIT flag now. Inferring it from filled fields
      // trapped staff who deliberately skipped optional answers in a loop of
      // re-prompts on every login.
      const table = role === "scout" ? "scout_context" : "coach_context";
      const { data: row } = await supabase
        .from(table)
        .select("completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return { hasContextRow: !!row, complete: !!row?.completed_at };
    },
  });

  return {
    role,
    onboardingPath: role ? `/onboarding/${role}` : null,
    hasContextRow: !!data?.hasContextRow,
    hasCompletedOnboarding: !!data?.complete,
    loading: roleLoading || (!!role && isLoading),
    refetch,
  };
}
