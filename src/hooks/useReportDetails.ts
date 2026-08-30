import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportPositionLook } from '@/lib/evaluation/positionGrades';
import type { BatSide, PitchingSide } from '@/lib/evaluation/scoutingTools';

/**
 * Child rows of a scouting report: the position looks (Defense / Arm at each
 * position seen in that one event), the per-batting-side offensive grades for
 * a switch hitter seen from both sides, and the per-throwing-side pitching
 * grades for an ambidextrous pitcher seen throwing with both hands.
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

export interface PitchingSideGrades {
  grade_id: string;
  throwing_hand: PitchingSide;
  [key: string]: unknown;
}

export interface ReportDetails {
  positions: ReportPositionLook[];
  batSides: BatSideGrades[];
  pitchingSides: PitchingSideGrades[];
  positionsByReport: Record<string, ReportPositionLook[]>;
  batSidesByReport: Record<string, BatSideGrades[]>;
  pitchingSidesByReport: Record<string, PitchingSideGrades[]>;
}

const EMPTY: ReportDetails = {
  positions: [],
  batSides: [],
  pitchingSides: [],
  positionsByReport: {},
  batSidesByReport: {},
  pitchingSidesByReport: {},
};

export function useReportDetails(reportIds: string[]) {
  const key = [...new Set(reportIds)].sort().join(',');
  return useQuery({
    queryKey: ['report-details', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<ReportDetails> => {
      const ids = key.split(',');
      const [pos, sides, pitchSides] = await Promise.all([
        supabase.from('vault_scout_grade_positions').select('*').in('grade_id', ids),
        supabase.from('vault_scout_grade_bat_sides').select('*').in('grade_id', ids),
        supabase.from('vault_scout_grade_pitching_sides').select('*').in('grade_id', ids),
      ]);
      if (pos.error) throw pos.error;
      if (sides.error) throw sides.error;
      if (pitchSides.error) throw pitchSides.error;

      const positions = (pos.data ?? []) as unknown as ReportPositionLook[];
      const batSides = (sides.data ?? []) as unknown as BatSideGrades[];
      const pitchingSides = (pitchSides.data ?? []) as unknown as PitchingSideGrades[];

      const positionsByReport: Record<string, ReportPositionLook[]> = {};
      for (const p of positions) (positionsByReport[p.grade_id] ??= []).push(p);
      const batSidesByReport: Record<string, BatSideGrades[]> = {};
      for (const s of batSides) (batSidesByReport[s.grade_id] ??= []).push(s);
      const pitchingSidesByReport: Record<string, PitchingSideGrades[]> = {};
      for (const s of pitchingSides) (pitchingSidesByReport[s.grade_id] ??= []).push(s);

      return { positions, batSides, pitchingSides, positionsByReport, batSidesByReport, pitchingSidesByReport };
    },
    initialData: EMPTY,
  });
}
