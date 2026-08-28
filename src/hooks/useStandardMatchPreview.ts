/**
 * Live match preview for a recruiting standard.
 *
 * Rules are inherited from `standardsMatching.ts` and are not relaxed here:
 *  - missing data is a fail, never a pass
 *  - only cv_measured / coach_evaluated grades are loaded at all
 *  - every criterion must pass (AND)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMatchInput,
  gradeRowToGrades,
  GRADE_COLUMNS,
  type GradeRow,
  type ProfileRow,
} from "@/lib/recruiting/standardFields";
import {
  evaluateStandardMatch,
  OFFICIAL_GRADE_SOURCES,
  type AthleteGrade,
  type StandardCriterion,
  type StandardMatchResult,
} from "@/lib/recruiting/standardsMatching";
import type { OrgStandardCriterion } from "./useOrgStandards";

const PROFILE_COLUMNS =
  "id, full_name, position, primary_throwing_hand, primary_batting_side, state, height_inches, weight, graduation_year, gpa, date_of_birth";

export interface StandardMatchRow extends StandardMatchResult {
  full_name: string | null;
}

export function useStandardMatchPreview(
  standardId: string | null,
  criteria: readonly OrgStandardCriterion[] | undefined,
) {
  const ready = !!standardId && !!criteria && criteria.length > 0;

  return useQuery({
    queryKey: ["standard-match-preview", standardId, criteria?.map((c) => c.id).join(",")],
    enabled: ready,
    queryFn: async (): Promise<StandardMatchRow[]> => {
      const [{ data: profiles, error: pErr }, { data: gradeRows, error: gErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("is_system_account", false)
          .limit(500),
        supabase
          .from("vault_scout_grades")
          .select(["user_id", "grade_source", "graded_at", ...GRADE_COLUMNS].join(", "))
          .in("grade_source", [...OFFICIAL_GRADE_SOURCES])
          .order("graded_at", { ascending: true })
          .limit(2000),
      ]);
      if (pErr) throw pErr;
      if (gErr) throw gErr;

      const gradesByAthlete = new Map<string, AthleteGrade[]>();
      for (const row of (gradeRows ?? []) as unknown as GradeRow[]) {
        const list = gradesByAthlete.get(row.user_id) ?? [];
        list.push(...gradeRowToGrades(row));
        gradesByAthlete.set(row.user_id, list);
      }

      const parsed: StandardCriterion[] = (criteria ?? []).map((c) => ({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value as StandardCriterion["value"],
      }));

      const rows: StandardMatchRow[] = [];
      for (const p of (profiles ?? []) as unknown as ProfileRow[]) {
        const input = buildMatchInput(p, gradesByAthlete.get(p.id) ?? []);
        const result = evaluateStandardMatch(parsed, input);
        if (result.matched) rows.push({ ...result, full_name: p.full_name ?? null });
      }
      return rows;
    },
  });
}

/** Persist the current matches so the athlete side can see them. */
export function useSaveStandardMatches(standardId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (athleteIds: readonly string[]) => {
      if (!standardId) return;
      const { error: delErr } = await supabase
        .from("standard_matches")
        .delete()
        .eq("standard_id", standardId);
      if (delErr) throw delErr;
      if (!athleteIds.length) return;
      const { error } = await supabase.from("standard_matches").insert(
        athleteIds.map((athlete_user_id) => ({ standard_id: standardId, athlete_user_id })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-standard-matches"] });
    },
  });
}
