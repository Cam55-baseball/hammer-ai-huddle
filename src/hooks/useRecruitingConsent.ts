/**
 * RR-9 / RR-10 — Athlete-owned recruiting consent hook.
 *
 * Single canonical read/write surface for `athlete_recruiting_consent`.
 * Visibility authority belongs to the athlete; viewers (coach/recruiter/
 * scout) never control consent — they only inherit visibility via RLS.
 *
 * resolved_visibility mirrors the server-side
 * `public.resolve_recruiting_visibility(athlete_id)` function:
 *   visibility_enabled && (!is_minor || parent_authorized)
 *
 * Subordinate to RR-9 (exposure ethics) and RR-10 (minor protection +
 * commercial subordination). Fail-closed: if anything is unknown,
 * resolved_visibility is false.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { emitExposureConsentChanged } from "@/lib/asb/topics/exposure";

const ENGINE_VERSION = "rr9-1.0.0";

export interface RecruitingConsentState {
  athlete_id: string;
  visibility_enabled: boolean;
  parent_authorized: boolean;
  is_minor: boolean;
  resolved_visibility: boolean;
  last_changed_at: string | null;
  last_changed_by: string | null;
  engine_version: string;
  is_self: boolean;
}

interface ConsentAuditRow {
  id: string;
  changed_at: string;
  changed_by: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown>;
  actor_role: string;
}

async function fetchIsMinor(athleteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_minor", { _user_id: athleteId });
  if (error) {
    // Fail-closed: unknown → treat as minor.
    console.warn("[rr9] is_minor rpc failed, failing closed", error);
    return true;
  }
  return Boolean(data);
}

async function fetchResolvedVisibility(athleteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("resolve_recruiting_visibility", {
    _athlete_id: athleteId,
  });
  if (error) {
    console.warn("[rr9] resolve_recruiting_visibility failed, failing closed", error);
    return false;
  }
  return Boolean(data);
}

export function useRecruitingConsent(athleteId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isSelf = !!user?.id && !!athleteId && user.id === athleteId;

  const query = useQuery<RecruitingConsentState | null>({
    queryKey: ["recruiting-consent", athleteId, user?.id],
    enabled: !!athleteId && !!user?.id,
    queryFn: async () => {
      if (!athleteId) return null;

      const [{ data: row, error }, isMinor, resolvedVisibility] = await Promise.all([
        supabase
          .from("athlete_recruiting_consent")
          .select(
            "athlete_id, visibility_enabled, parent_authorized, last_changed_at, last_changed_by, engine_version",
          )
          .eq("athlete_id", athleteId)
          .maybeSingle(),
        fetchIsMinor(athleteId),
        fetchResolvedVisibility(athleteId),
      ]);

      // RLS may legitimately deny non-self viewers when visibility is off —
      // that is the fail-closed signal. Translate to a closed state.
      if (error && error.code !== "PGRST116") {
        console.warn("[rr9] consent read denied / errored", error);
      }

      return {
        athlete_id: athleteId,
        visibility_enabled: row?.visibility_enabled ?? false,
        parent_authorized: row?.parent_authorized ?? false,
        is_minor: isMinor,
        resolved_visibility: resolvedVisibility,
        last_changed_at: row?.last_changed_at ?? null,
        last_changed_by: row?.last_changed_by ?? null,
        engine_version: row?.engine_version ?? ENGINE_VERSION,
        is_self: isSelf,
      };
    },
    staleTime: 30_000,
  });

  const setVisibility = useMutation({
    mutationFn: async (next: boolean) => {
      if (!user?.id || !athleteId) throw new Error("not authenticated");
      if (user.id !== athleteId) throw new Error("rr9: only the athlete may change own consent");

      const prev = query.data;
      const { error } = await supabase
        .from("athlete_recruiting_consent")
        .upsert(
          {
            athlete_id: athleteId,
            visibility_enabled: next,
            parent_authorized: prev?.parent_authorized ?? false,
            last_changed_by: user.id,
            engine_version: ENGINE_VERSION,
          },
          { onConflict: "athlete_id" },
        );
      if (error) throw error;

      await emitExposureConsentChanged({
        athleteId,
        actorId: user.id,
        previous: prev
          ? {
              visibility_enabled: prev.visibility_enabled,
              parent_authorized: prev.parent_authorized,
            }
          : null,
        next: {
          visibility_enabled: next,
          parent_authorized: prev?.parent_authorized ?? false,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recruiting-consent", athleteId] });
    },
  });

  return {
    consent: query.data ?? null,
    isLoading: query.isLoading,
    setVisibility: (next: boolean) => setVisibility.mutateAsync(next),
    isSaving: setVisibility.isPending,
  };
}

export function useRecruitingConsentAudit(athleteId: string | undefined) {
  return useQuery<ConsentAuditRow[]>({
    queryKey: ["recruiting-consent-audit", athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_recruiting_consent_audit")
        .select("id, changed_at, changed_by, previous_state, new_state, actor_role")
        .eq("athlete_id", athleteId!)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) {
        console.warn("[rr9] audit read failed", error);
        return [];
      }
      return (data ?? []) as ConsentAuditRow[];
    },
  });
}
