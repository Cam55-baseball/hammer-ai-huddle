import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportPositionLook } from '@/lib/evaluation/positionGrades';
import type { BatSide } from '@/lib/evaluation/scoutingTools';

/**
 * Child rows of a scouting report: the position looks (Defense / Arm at each
 * position seen in that one event) and the per-batting-side offensive grades
 * for a switch hitter seen from both sides.
 *
 * Visibility mirrors the parent report exactly — enforced in RLS, so an
 * unconfirmed report's children stay author-only just like the report itself.
 */

export interface BatSideGrades {
  grade_id: string;
  bat_side: BatSide;
  hitting_grade: number | null;
  hitting_grade_future: number | null;
  power_grade: number | null;
  power_grade_future: number | null;
  plate_discipline_grade: number | null;
  plate_discipline_grade_future: number | null;
}

export interface ReportDetails {
  positions: ReportPositionLook[];
  batSides: BatSideGrades[];
  positionsByReport: Record<string, ReportPositionLook[]>;
  batSidesByReport: Record<string, BatSideGrades[]>;
}

const EMPTY: ReportDetails = {
  positions: [],
  batSides: [],
  positionsByReport: {},
  batSidesByReport: {},
};

export function useReportDetails(reportIds: string[]) {
  const key = [...new Set(reportIds)].sort().join(',');
  return useQuery({
    queryKey: ['report-details', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<ReportDetails> => {
      const ids = key.split(',');
      const [pos, sides] = await Promise.all([
        supabase.from('vault_scout_grade_positions').select('*').in('grade_id', ids),
        supabase.from('vault_scout_grade_bat_sides').select('*').in('grade_id', ids),
      ]);
      if (pos.error) throw pos.error;
      if (sides.error) throw sides.error;

      const positions = (pos.data ?? []) as unknown as ReportPositionLook[];
      const batSides = (sides.data ?? []) as unknown as BatSideGrades[];

      const positionsByReport: Record<string, ReportPositionLook[]> = {};
      for (const p of positions) (positionsByReport[p.grade_id] ??= []).push(p);
      const batSidesByReport: Record<string, BatSideGrades[]> = {};
      for (const s of batSides) (batSidesByReport[s.grade_id] ??= []).push(s);

      return { positions, batSides, positionsByReport, batSidesByReport };
    },
    initialData: EMPTY,
  });
}
