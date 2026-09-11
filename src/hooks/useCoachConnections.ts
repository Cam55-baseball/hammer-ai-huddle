/**
 * Single source of truth for the people linked to the signed-in athlete.
 *
 * Both "My Connections" and "Manage who has access" read this hook, so the two
 * screens can never disagree about who is in the athlete's circle.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CoachConnection {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_avatar: string | null;
  status: string;
  initiated_by: string;
  relationship_type: string;
  confirmed_at: string | null;
  created_at: string;
}

export const COACH_CONNECTIONS_KEY = "coach-connections";

export function useCoachConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [COACH_CONNECTIONS_KEY, user?.id],
    queryFn: async (): Promise<CoachConnection[]> => {
      const { data, error } = await supabase.functions.invoke("get-coach-connections");
      if (error) throw error;
      return (data?.results ?? []) as CoachConnection[];
    },
    enabled: !!user,
  });
}
