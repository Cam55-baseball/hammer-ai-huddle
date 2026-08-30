/**
 * Recruiting standards — org/scout side data access.
 * Pre-release: reachable only from the staff-gated /recruiting/standards route.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  PositionMatchLogic,
  StandardOperator,
} from "@/lib/recruiting/standardsMatching";
import type { RecruitingRole } from "@/lib/recruiting/standardFields";

export interface OrgStandard {
  id: string;
  org_user_id: string;
  org_name: string;
  label: string;
  sport: string;
  active: boolean;
  recruiting_role: RecruitingRole;
  target_positions: string[];
  position_match_logic: PositionMatchLogic;
  created_at: string;
  updated_at: string;
}

export interface OrgStandardCriterion {
  id: string;
  standard_id: string;
  field: string;
  operator: StandardOperator;
  value: unknown;
  /** Mandatory criteria gate the match; preferred ones only add nuance. */
  is_mandatory: boolean;
  created_at: string;
}


export function useOrgStandards() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const standards = useQuery({
    queryKey: ["org-standards", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<OrgStandard[]> => {
      const { data, error } = await supabase
        .from("org_standards")
        .select("*")
        .eq("org_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgStandard[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["org-standards"] });
  };

  const createStandard = useMutation({
    mutationFn: async (input: { org_name: string; label: string; sport: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("org_standards")
        .insert({ ...input, org_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as OrgStandard;
    },
    onSuccess: invalidate,
  });

  const updateStandard = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<OrgStandard> & { id: string }) => {
      const { error } = await supabase.from("org_standards").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteStandard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_standards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Clone a standard and every one of its criteria into a fresh, renameable copy.
   * Serves related profiles for one position ("RHP — Power Arm" / "RHP — Command")
   * without rebuilding the sheet from zero.
   */
  const duplicateStandard = useMutation({
    mutationFn: async (source: OrgStandard): Promise<OrgStandard> => {
      const { data: created, error: createError } = await supabase
        .from("org_standards")
        .insert({
          org_user_id: user!.id,
          org_name: source.org_name,
          label: `${source.label} (copy)`,
          sport: source.sport,
          // A clone starts inactive so a half-renamed profile never matches anyone.
          active: false,
        })
        .select()
        .single();
      if (createError) throw createError;

      const { data: sourceCriteria, error: readError } = await supabase
        .from("org_standard_criteria")
        .select("field, operator, value")
        .eq("standard_id", source.id);
      if (readError) throw readError;

      if (sourceCriteria?.length) {
        const { error: copyError } = await supabase.from("org_standard_criteria").insert(
          sourceCriteria.map((c) => ({
            standard_id: (created as OrgStandard).id,
            field: c.field,
            operator: c.operator,
            value: c.value as never,
          })),
        );
        if (copyError) throw copyError;
      }

      return created as OrgStandard;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["org-standard-criteria"] });
      qc.invalidateQueries({ queryKey: ["org-standards-criteria-map"] });
    },
  });

  return { standards, createStandard, updateStandard, deleteStandard, duplicateStandard };
}

/**
 * Every criterion across a set of standards, keyed by standard id.
 * Used to group the standards list by the position each profile targets.
 */
export function useStandardsCriteriaMap(standardIds: string[]) {
  const key = [...standardIds].sort().join(",");
  return useQuery({
    queryKey: ["org-standards-criteria-map", key],
    enabled: standardIds.length > 0,
    queryFn: async (): Promise<Record<string, OrgStandardCriterion[]>> => {
      const { data, error } = await supabase
        .from("org_standard_criteria")
        .select("*")
        .in("standard_id", standardIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const map: Record<string, OrgStandardCriterion[]> = {};
      for (const row of (data ?? []) as unknown as OrgStandardCriterion[]) {
        (map[row.standard_id] ??= []).push(row);
      }
      return map;
    },
  });
}

export function useStandardCriteria(standardId: string | null) {
  const qc = useQueryClient();

  const criteria = useQuery({
    queryKey: ["org-standard-criteria", standardId],
    enabled: !!standardId,
    queryFn: async (): Promise<OrgStandardCriterion[]> => {
      const { data, error } = await supabase
        .from("org_standard_criteria")
        .select("*")
        .eq("standard_id", standardId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OrgStandardCriterion[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["org-standard-criteria", standardId] });
  };

  const addCriterion = useMutation({
    mutationFn: async (input: { field: string; operator: StandardOperator; value: unknown }) => {
      const { error } = await supabase.from("org_standard_criteria").insert({
        standard_id: standardId!,
        field: input.field,
        operator: input.operator,
        value: input.value as never,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCriterion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_standard_criteria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { criteria, addCriterion, deleteCriterion };
}

/** Athlete side: standards this user has matched. */
export function useMyStandardMatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-standard-matches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("standard_matches")
        .select("id, matched_at, standard_id, org_standards(label, org_name, sport, active)")
        .eq("athlete_user_id", user!.id)
        .order("matched_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        matched_at: string;
        standard_id: string;
        org_standards: { label: string; org_name: string; sport: string; active: boolean } | null;
      }>;
    },
  });
}
