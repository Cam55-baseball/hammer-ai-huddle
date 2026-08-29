import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Evaluation attribution & confirmation.
 *
 * Trust rules (enforced in RLS, mirrored here):
 *  - An official report (grade_source = 'coach_evaluated') is readable by the
 *    athlete and their accepted followers ONLY after the athlete confirms they
 *    were present at the evaluation event.
 *  - Until then it is readable only by its author. The athlete sees a stub
 *    (date / event / evaluator identity) via get_pending_evaluations(), which
 *    never exposes grades or notes.
 *  - Every official report carries an evaluator_id. No anonymous grades.
 */

export interface EvaluationRow {
  id: string;
  user_id: string;
  evaluator_id: string | null;
  grade_type: string | null;
  grade_source: string | null;
  graded_at: string;
  evaluation_context: string | null;
  event_description: string | null;
  overall_grade: number | null;
  notes: string | null;
  player_confirmed: boolean;
  player_confirmed_at: string | null;
  /** Athlete stated they were NOT there. Terminal: stays author-only forever. */
  player_rejected?: boolean;
  player_rejected_at?: string | null;
  [key: string]: unknown;
}

export interface EvaluatorIdentity {
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role: string | null;
  evaluator_title: string | null;
  evaluator_organization: string | null;
  report_count: number;
  latest_graded_at: string;
}

export interface PendingEvaluation {
  id: string;
  graded_at: string;
  evaluation_context: string | null;
  event_description: string | null;
  grade_type: string | null;
  evaluator_id: string | null;
  evaluator_name: string;
  evaluator_role: string | null;
  evaluator_title: string | null;
  evaluator_organization: string | null;
}

const OFFICIAL = 'coach_evaluated';

/** Stubs of reports awaiting the signed-in athlete's attendance confirmation. */
export function usePendingEvaluations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-evaluations', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PendingEvaluation[]> => {
      const { data, error } = await supabase.rpc('get_pending_evaluations');
      if (error) throw error;
      return (data ?? []) as PendingEvaluation[];
    },
  });
}

/** Confirmed official reports written about the signed-in athlete. */
export function useMyEvaluations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-evaluations', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<EvaluationRow[]> => {
      const { data, error } = await supabase
        .from('vault_scout_grades')
        .select('*')
        .eq('user_id', user!.id)
        .eq('grade_source', OFFICIAL)
        .order('graded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EvaluationRow[];
    },
  });
}

/** Reports the signed-in evaluator has filed, newest first. */
export function useFiledEvaluations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['filed-evaluations', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<EvaluationRow[]> => {
      const { data, error } = await supabase
        .from('vault_scout_grades')
        .select('*')
        .eq('evaluator_id', user!.id)
        .eq('grade_source', OFFICIAL)
        .order('graded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EvaluationRow[];
    },
  });
}

/** Everyone who has filed a confirmed official report on this athlete. */
export function useAthleteEvaluators(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['athlete-evaluators', athleteId],
    enabled: !!athleteId,
    queryFn: async (): Promise<EvaluatorIdentity[]> => {
      const { data, error } = await supabase.rpc('get_athlete_evaluators', {
        p_athlete_id: athleteId!,
      });
      if (error) throw error;
      return (data ?? []) as EvaluatorIdentity[];
    },
  });
}

/** Confirmed official reports on an athlete (used by followers/coaches). */
export function useAthleteEvaluations(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['athlete-evaluations', athleteId],
    enabled: !!athleteId,
    queryFn: async (): Promise<EvaluationRow[]> => {
      const { data, error } = await supabase
        .from('vault_scout_grades')
        .select('*')
        .eq('user_id', athleteId!)
        .eq('grade_source', OFFICIAL)
        .order('graded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EvaluationRow[];
    },
  });
}

/** Athlete confirms they were present at the evaluation event. */
export function useConfirmAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evaluationId: string) => {
      const { data, error } = await supabase.rpc('confirm_evaluation_attendance', {
        p_evaluation_id: evaluationId,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-evaluations'] });
      qc.invalidateQueries({ queryKey: ['my-evaluations'] });
      qc.invalidateQueries({ queryKey: ['athlete-evaluators'] });
    },
  });
}

/**
 * Athlete states they were NOT at the event. Terminal: the report is closed out
 * and stays visible only to its author — `player_confirmed` is never set, so the
 * existing RLS keeps it away from the athlete and their followers forever.
 */
export function useRejectAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evaluationId: string) => {
      const { data, error } = await supabase.rpc('reject_evaluation_attendance', {
        p_evaluation_id: evaluationId,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-evaluations'] });
      qc.invalidateQueries({ queryKey: ['my-evaluations'] });
      qc.invalidateQueries({ queryKey: ['filed-evaluations'] });
    },
  });
}

/** Names for evaluator ids, for the "filed by me" list (athlete names). */
export function useProfileNames(ids: string[]) {
  const key = [...new Set(ids)].sort().join(',');
  return useQuery({
    queryKey: ['profile-names', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', key.split(','));
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.id] = r.full_name ?? 'Unnamed';
      return map;
    },
  });
}
