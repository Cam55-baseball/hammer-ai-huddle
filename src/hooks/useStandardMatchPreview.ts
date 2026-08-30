/**
 * Live match preview for a recruiting standard.
 *
 * Rules are inherited from `standardsMatching.ts` and are not relaxed here:
 *  - missing data is a fail, never a pass
 *  - only cv_measured / coach_evaluated grades are loaded at all
 *  - every MANDATORY criterion must pass; preferred ones only add nuance
 *
 * Position-scoped defense/arm and bat-side-scoped hitting/power/discipline are
 * read from their child tables, not from the flat mirror columns on
 * `vault_scout_grades` (which only reflect the primary position / primary side).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMatchInput,
  gradeRowToGrades,
  scopedRowsToGrades,
  GRADE_COLUMNS,
  type GradeRow,
  type ProfileRow,
} from "@/lib/recruiting/standardFields";
import {
  evaluateStandardMatch,
  BAT_SIDE_SCOPED_FIELDS,
  DEFAULT_STANDARD_CONTEXT,
  OFFICIAL_GRADE_SOURCES,
  POSITION_SCOPED_FIELDS,
  type AthleteGrade,
  type ScopedGrades,
  type StandardContext,
  type StandardCriterion,
  type StandardMatchResult,
} from "@/lib/recruiting/standardsMatching";
import type { OrgStandardCriterion } from "./useOrgStandards";

const PROFILE_COLUMNS =
  "id, full_name, position, primary_throwing_hand, primary_batting_side, is_switch_hitter, state, height_inches, weight, graduation_year, gpa, date_of_birth";

export interface StandardMatchRow extends StandardMatchResult {
  full_name: string | null;
}

export function useStandardMatchPreview(
  standardId: string | null,
  criteria: readonly OrgStandardCriterion[] | undefined,
  context: StandardContext = DEFAULT_STANDARD_CONTEXT,
) {
  const mandatoryCount = (criteria ?? []).filter((c) => c.is_mandatory !== false).length;
  const ready = !!standardId && mandatoryCount > 0;
  const contextKey = `${context.targetPositions.join("|")}::${context.positionMatchLogic}`;

  return useQuery({
    queryKey: [
      "standard-match-preview",
      standardId,
      criteria?.map((c) => `${c.id}:${c.is_mandatory}`).join(","),
      contextKey,
    ],
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
          .select(["id", "user_id", "grade_source", "graded_at", ...GRADE_COLUMNS].join(", "))
          .in("grade_source", [...OFFICIAL_GRADE_SOURCES])
          .order("graded_at", { ascending: true })
          .limit(2000),
      ]);
      if (pErr) throw pErr;
      if (gErr) throw gErr;

      const officialRows = (gradeRows ?? []) as unknown as Array<GradeRow & { id: string }>;
      const gradeIds = officialRows.map((r) => r.id).filter(Boolean);

      // grade_id -> source, so child rows inherit the parent's official source.
      const sourceByGradeId = new Map<string, string>();
      const athleteByGradeId = new Map<string, string>();
      for (const row of officialRows) {
        sourceByGradeId.set(row.id, row.grade_source ?? "");
        athleteByGradeId.set(row.id, row.user_id);
      }

      const [{ data: posRows, error: posErr }, { data: sideRows, error: sideErr }] =
        gradeIds.length
          ? await Promise.all([
              supabase
                .from("vault_scout_grade_positions")
                .select("grade_id, position, defense_grade, throwing_grade")
                .in("grade_id", gradeIds),
              supabase
                .from("vault_scout_grade_bat_sides")
                .select("grade_id, bat_side, hitting_grade, power_grade, plate_discipline_grade")
                .in("grade_id", gradeIds),
            ])
          : [
              { data: [], error: null },
              { data: [], error: null },
            ];
      if (posErr) throw posErr;
      if (sideErr) throw sideErr;

      const gradesByAthlete = new Map<string, AthleteGrade[]>();
      for (const row of officialRows) {
        const list = gradesByAthlete.get(row.user_id) ?? [];
        list.push(...gradeRowToGrades(row));
        gradesByAthlete.set(row.user_id, list);
      }

      // Bucket child rows by athlete before collapsing them into scopes.
      const posByAthlete = new Map<string, Array<Record<string, unknown>>>();
      const positionsPlayed = new Map<string, Set<string>>();
      for (const row of (posRows ?? []) as Array<Record<string, unknown>>) {
        const athlete = athleteByGradeId.get(String(row.grade_id ?? ""));
        if (!athlete) continue;
        (posByAthlete.get(athlete) ?? posByAthlete.set(athlete, []).get(athlete)!).push(row);
        const pos = String(row.position ?? "").trim().toLowerCase();
        if (pos) (positionsPlayed.get(athlete) ?? positionsPlayed.set(athlete, new Set()).get(athlete)!).add(pos);
      }
      const sideByAthlete = new Map<string, Array<Record<string, unknown>>>();
      for (const row of (sideRows ?? []) as Array<Record<string, unknown>>) {
        const athlete = athleteByGradeId.get(String(row.grade_id ?? ""));
        if (!athlete) continue;
        (sideByAthlete.get(athlete) ?? sideByAthlete.set(athlete, []).get(athlete)!).push(row);
      }

      const parsed: StandardCriterion[] = (criteria ?? []).map((c) => ({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value as StandardCriterion["value"],
        is_mandatory: c.is_mandatory !== false,
      }));

      const rows: StandardMatchRow[] = [];
      for (const p of (profiles ?? []) as unknown as ProfileRow[]) {
        const posScoped: ScopedGrades[] = scopedRowsToGrades(
          posByAthlete.get(p.id) ?? [],
          "position",
          POSITION_SCOPED_FIELDS,
          sourceByGradeId,
        );
        const sideScoped: ScopedGrades[] = scopedRowsToGrades(
          sideByAthlete.get(p.id) ?? [],
          "bat_side",
          BAT_SIDE_SCOPED_FIELDS,
          sourceByGradeId,
        );
        const input = buildMatchInput(p, gradesByAthlete.get(p.id) ?? [], {
          positionGrades: posScoped,
          batSideGrades: sideScoped,
          positionsPlayed: [...(positionsPlayed.get(p.id) ?? [])],
        });
        const result = evaluateStandardMatch(parsed, input, context);
        if (result.matched) rows.push({ ...result, full_name: p.full_name ?? null });
      }
      // Best fit first: more preferred criteria met is a stronger candidate.
      rows.sort((a, b) => b.preferred_met - a.preferred_met);
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
