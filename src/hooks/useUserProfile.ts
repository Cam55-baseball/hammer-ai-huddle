import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const userProfileKey = (userId?: string) => ["user-profile", userId];

export interface UserProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  position?: string | null;
  experience_level?: string | null;
  height?: string | null;
  weight?: string | null;
  state?: string | null;
  team_affiliation?: string | null;
  high_school_grad_year?: number | null;
  college_grad_year?: number | null;
  throwing_hand?: string | null;
  batting_side?: string | null;
  commitment_status?: string | null;
  date_of_birth?: string | null;
  sat_score?: number | null;
  act_score?: number | null;
  gpa?: number | null;
  ncaa_id?: string | null;
  preferred_language?: string | null;
  activation_choice?: string | null;
  [key: string]: any;
}

/**
 * Single source of truth for the current user's profile row.
 * Cached app-wide; any mutation invalidates every consumer instantly.
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userProfileKey(user?.id),
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const updateProfile = useMutation({
    mutationFn: async (patch: Partial<UserProfile>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userProfileKey(user?.id), data);
      queryClient.invalidateQueries({ queryKey: userProfileKey(user?.id) });
    },
  });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateProfile: updateProfile.mutateAsync,
    isUpdating: updateProfile.isPending,
  };
};
