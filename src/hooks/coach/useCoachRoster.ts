import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type RosterSource = "mpi" | "organization" | "scout_follow";

export interface RosterAthlete {
  athleteId: string;
  displayName: string;
  avatarUrl: string | null;
  sources: RosterSource[];
}

/**
 * Resolves the coach's roster as a union of:
 *  - athlete_mpi_settings.primary_coach_id / secondary_coach_ids
 *  - organization_members (same org, both active)
 *  - scout_follows (relationship_type='linked', status='accepted')
 *
 * Read-only. No new identity model. Deduplicated by athlete_id.
 */
export function useCoachRoster() {
  const { user } = useAuth();
  const coachId = user?.id ?? null;

  return useQuery({
    queryKey: ["coach-roster", coachId],
    enabled: !!coachId,
    staleTime: 60_000,
    queryFn: async (): Promise<RosterAthlete[]> => {
      if (!coachId) return [];
      const map = new Map<string, RosterAthlete>();

      const addAthlete = (id: string, source: RosterSource) => {
        if (!id || id === coachId) return;
        const existing = map.get(id);
        if (existing) {
          if (!existing.sources.includes(source)) existing.sources.push(source);
        } else {
          map.set(id, { athleteId: id, displayName: "Athlete", avatarUrl: null, sources: [source] });
        }
      };

      // 1. MPI coach assignment (primary + secondary)
      const { data: mpiPrimary } = await supabase
        .from("athlete_mpi_settings")
        .select("user_id")
        .eq("primary_coach_id", coachId);
      mpiPrimary?.forEach((r) => addAthlete(r.user_id, "mpi"));

      const { data: mpiSecondary } = await supabase
        .from("athlete_mpi_settings")
        .select("user_id, secondary_coach_ids")
        .contains("secondary_coach_ids", [coachId]);
      mpiSecondary?.forEach((r) => addAthlete(r.user_id, "mpi"));

      // 2. Organization membership union
      const { data: myOrgs } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", coachId)
        .eq("status", "active");
      const orgIds = (myOrgs ?? []).map((o) => o.organization_id);
      if (orgIds.length > 0) {
        const { data: members } = await supabase
          .from("organization_members")
          .select("user_id")
          .in("organization_id", orgIds)
          .eq("status", "active");
        members?.forEach((m) => addAthlete(m.user_id, "organization"));
      }

      // 3. Linked scout follows
      const { data: follows } = await supabase
        .from("scout_follows")
        .select("player_id")
        .eq("scout_id", coachId)
        .eq("status", "accepted")
        .eq("relationship_type", "linked");
      follows?.forEach((f) => addAthlete(f.player_id, "scout_follow"));

      // Hydrate display names (best-effort; missing -> "Athlete")
      const ids = Array.from(map.keys());
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id, full_name, avatar_url")
          .in("id", ids);
        profiles?.forEach((p: any) => {
          const a = map.get(p.id);
          if (a) {
            a.displayName = p.full_name ?? "Athlete";
            a.avatarUrl = p.avatar_url ?? null;
          }
        });
      }

      return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
  });
}
