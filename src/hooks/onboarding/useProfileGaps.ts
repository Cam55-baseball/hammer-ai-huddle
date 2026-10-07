import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { profileGaps, type ProfileGap } from "@/lib/onboarding/profileGaps";
import { yearsOldFromDob } from "@/lib/auth/under13Lock";

export interface ProfileGapState {
  gaps: ProfileGap[];
  anthropometrics: Record<string, unknown>;
  under13: boolean;
  sport: "baseball" | "softball";
  loading: boolean;
}

export function useProfileGaps(): ProfileGapState {
  const { user } = useOptionalAuth();
  const q = useQuery({
    queryKey: ["profile-gaps", user?.id],
    enabled: !!user,
    staleTime: 10_000,
    queryFn: async () => {
      const [ctx, eq, prof] = await Promise.all([
        supabase.from("athlete_context")
          .select("sport_primary, anthropometrics, category_goals, goal_summary, goal_priority_rank, competition_level, lifting_age_years, lifting_history")
          .eq("user_id", user!.id).maybeSingle(),
        supabase.from("athlete_equipment_context").select("equipment").eq("user_id", user!.id).eq("scope", "persistent").maybeSingle(),
        supabase.from("profiles").select("date_of_birth").eq("id", user!.id).maybeSingle(),
      ]);
      const c = (ctx.data ?? {}) as Record<string, any>;
      const dob = (prof.data as { date_of_birth?: string | null } | null)?.date_of_birth ?? null;
      const age = dob ? yearsOldFromDob(dob) : null;
      return {
        gaps: profileGaps({ ...c, equipment: (eq.data as { equipment?: string[] } | null)?.equipment ?? [] }),
        anthropometrics: (c.anthropometrics ?? {}) as Record<string, unknown>,
        under13: age != null && age < 13,
        sport: (c.sport_primary === "softball" ? "softball" : "baseball") as "baseball" | "softball",
      };
    },
  });
  return { gaps: q.data?.gaps ?? [], anthropometrics: q.data?.anthropometrics ?? {}, under13: q.data?.under13 ?? false, sport: q.data?.sport ?? "baseball", loading: q.isLoading };
}
