/**
 * RR-10 — Parent-driven recruiting authorization write surface.
 *
 * Sole canonical path for flipping `athlete_recruiting_consent.parent_authorized`.
 * The database trigger `enforce_parent_authorization_authority` enforces
 * that only an authorizing parent may perform the change — this hook is
 * the cooperative client-side surface that uses it.
 *
 * Athletes / coaches / recruiters / scouts cannot reach this hook; the
 * server will reject their write regardless.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { emitExposureConsentChanged } from "@/lib/asb/topics/exposure";

const ENGINE_VERSION = "rr9-1.0.0";

export interface ParentAuthorizationState {
  athlete_id: string;
  visibility_enabled: boolean;
  parent_authorized: boolean;
  last_changed_at: string | null;
  last_changed_by: string | null;
}

export function useParentAuthorizationState(athleteId: string | undefined) {
  return useQuery<ParentAuthorizationState | null>({
    queryKey: ["parent-authorization-state", athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_recruiting_consent")
        .select(
          "athlete_id, visibility_enabled, parent_authorized, last_changed_at, last_changed_by",
        )
        .eq("athlete_id", athleteId!)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.warn("[rr10] parent consent read failed", error);
      }
      if (!data) {
        return {
          athlete_id: athleteId!,
          visibility_enabled: false,
          parent_authorized: false,
          last_changed_at: null,
          last_changed_by: null,
        };
      }
      return data as ParentAuthorizationState;
    },
    staleTime: 15_000,
  });
}

export function useParentRecruitingAuthorization(athleteId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const stateQuery = useParentAuthorizationState(athleteId);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!user?.id || !athleteId) throw new Error("not authenticated");
      const prev = stateQuery.data;

      const { error } = await supabase
        .from("athlete_recruiting_consent")
        .upsert(
          {
            athlete_id: athleteId,
            visibility_enabled: prev?.visibility_enabled ?? false,
            parent_authorized: next,
            last_changed_by: user.id,
            engine_version: ENGINE_VERSION,
          },
          { onConflict: "athlete_id" },
        );
      if (error) throw error;

      await emitExposureConsentChanged({
        athleteId,
        actorId: user.id,
        actorRole: "parent",
        changeType: next ? "grant" : "revoke",
        previous: prev
          ? {
              visibility_enabled: prev.visibility_enabled,
              parent_authorized: prev.parent_authorized,
            }
          : null,
        next: {
          visibility_enabled: prev?.visibility_enabled ?? false,
          parent_authorized: next,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent-authorization-state", athleteId] });
      qc.invalidateQueries({ queryKey: ["recruiting-consent", athleteId] });
      qc.invalidateQueries({ queryKey: ["recruiting-consent-audit", athleteId] });
    },
  });

  return {
    state: stateQuery.data ?? null,
    isLoading: stateQuery.isLoading,
    setParentAuthorized: (next: boolean) => mutation.mutateAsync(next),
    isSaving: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
