/**
 * RR-10 — Parent↔athlete linkage hook.
 *
 * Reads the rows of `public.parent_athlete_links` where the current user
 * is the parent. The link itself is the canonical authority signal:
 * `status = 'active'` and `revoked_at IS NULL` means the parent may act
 * as the authorizing parent for that athlete (see
 * `public.is_authorizing_parent`).
 *
 * No write paths here; link creation flows through the existing
 * `parent_invite_dispatches` accept pathway.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ParentAthleteLink {
  id: string;
  parent_user_id: string;
  athlete_user_id: string;
  relationship: string;
  status: "pending" | "active" | "revoked";
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  athlete_full_name: string | null;
}

export function useParentLinks() {
  const { user } = useAuth();

  return useQuery<ParentAthleteLink[]>({
    queryKey: ["parent-athlete-links", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_athlete_links")
        .select(
          "id, parent_user_id, athlete_user_id, relationship, status, invited_at, accepted_at, revoked_at",
        )
        .eq("parent_user_id", user!.id)
        .order("invited_at", { ascending: false });
      if (error) {
        console.warn("[rr10] parent_athlete_links read failed", error);
        return [];
      }
      const rows = (data ?? []) as Omit<ParentAthleteLink, "athlete_full_name">[];
      if (rows.length === 0) return [];

      const ids = Array.from(new Set(rows.map((r) => r.athlete_user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);

      const nameById = new Map<string, string | null>(
        (profiles ?? []).map((p) => [p.id as string, (p.full_name ?? null) as string | null]),
      );
      return rows.map((r) => ({ ...r, athlete_full_name: nameById.get(r.athlete_user_id) ?? null }));
    },
    staleTime: 30_000,
  });
}

/**
 * Verifies — client-side — that the current user holds an active parent
 * link for the given athlete. The DB enforces the same rule via
 * `is_authorizing_parent` (RLS + trigger); this hook exists only to
 * gate UI mount eligibility.
 */
export function useIsAuthorizingParent(athleteId: string | undefined) {
  const { user } = useAuth();
  return useQuery<boolean>({
    queryKey: ["is-authorizing-parent", user?.id, athleteId],
    enabled: !!user?.id && !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_athlete_links")
        .select("id")
        .eq("parent_user_id", user!.id)
        .eq("athlete_user_id", athleteId!)
        .eq("status", "active")
        .is("revoked_at", null)
        .maybeSingle();
      if (error) {
        console.warn("[rr10] is_authorizing_parent client check failed", error);
        return false;
      }
      return !!data;
    },
  });
}
