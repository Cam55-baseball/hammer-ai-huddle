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

      if (role === "scout") {
        const { data: row } = await supabase
          .from("scout_context")
          .select("org_name, sports, evaluation_focus")
          .eq("user_id", user.id)
          .maybeSingle();
        const complete =
          !!row?.org_name && !!row?.sports?.length && !!row?.evaluation_focus?.length;
        return { hasContextRow: !!row, complete };
      }

      const { data: row } = await supabase
        .from("coach_context")
        .select("org_name, age_groups, primary_disciplines")
        .eq("user_id", user.id)
        .maybeSingle();
      const complete =
        !!row?.org_name && !!row?.age_groups?.length && !!row?.primary_disciplines?.length;
      return { hasContextRow: !!row, complete };
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
