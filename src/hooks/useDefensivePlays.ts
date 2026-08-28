import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  computeBeatenRunnerGrade,
  type BatterHandedness,
  type ScaleReferenceRow,
} from '@/lib/defense/beatenRunnerGrade';
import { computeCatchProbability, computeOaeCredit } from '@/lib/defense/catchProbability';

export interface DefensivePlayRow {
  id: string;
  user_id: string;
  at_bat_id: string | null;
  fielder_id: string | null;
  fielder_position: string | null;
  ball_landing_location: unknown;
  distance_to_cover: number | null;
  hang_time_sec: number | null;
  total_play_time_sec: number | null;
  outcome: string | null;
  catch_probability: number | null;
  oae_credit: number | null;
  beaten_runner_grade: number | null;
  missing_reason: string | null;
  source: string;
  recorded_by: string | null;
  created_at: string;
}

export interface DefensivePlayInput {
  athleteId: string;
  atBatId: string | null;
  fielderId: string | null;
  fielderPosition: string;
  ballLandingLocation: { zone: string; note?: string } | null;
  distanceToCoverFt: number | null;
  hangTimeSec: number | null;
  totalPlayTimeSec: number | null;
  outcome: string;
  batterHand: BatterHandedness;
}

/** Home-to-first reference splits, loaded once and shared by the grade math. */
export function useHomeToFirstScale() {
  const [rows, setRows] = useState<ScaleReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase as any)
        .from('scale_reference')
        .select('metric, direction, floor_value, avg_value, record_value')
        .in('metric', ['home_to_first_rhh', 'home_to_first_lhh']);
      if (!cancelled) {
        setRows((data ?? []) as ScaleReferenceRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading };
}

/**
 * Derived values for one play. Pure pass-through to the tested calculators —
 * this hook layer never re-implements the math.
 */
export function deriveDefensivePlayMetrics(
  input: Pick<
    DefensivePlayInput,
    'hangTimeSec' | 'distanceToCoverFt' | 'totalPlayTimeSec' | 'outcome' | 'batterHand'
  >,
  scaleRows: readonly ScaleReferenceRow[],
) {
  const catchRes = computeCatchProbability(input.hangTimeSec, input.distanceToCoverFt);
  const catchProbability = catchRes.missing ? null : catchRes.probability;
  const oaeCredit = computeOaeCredit(catchProbability, input.outcome);
  const runnerRes = computeBeatenRunnerGrade(
    input.totalPlayTimeSec,
    input.batterHand,
    scaleRows,
  );

  const missingReasons = [
    catchRes.missing ? catchRes.missing_reason : null,
    runnerRes.missing ? runnerRes.missing_reason : null,
  ].filter(Boolean) as string[];

  return {
    catchProbability,
    oaeCredit,
    beatenRunnerGrade: runnerRes.missing ? null : runnerRes.grade,
    catchMissingReason: catchRes.missing ? catchRes.missing_reason : null,
    runnerMissingReason: runnerRes.missing ? runnerRes.missing_reason : null,
    missingReason: missingReasons.length ? missingReasons.join(',') : null,
  };
}

/** Evaluator write path. Everything logged here is manual_entry provenance. */
export function useRecordDefensivePlay() {
  const { user } = useAuth();
  const { rows: scaleRows } = useHomeToFirstScale();
  const [saving, setSaving] = useState(false);

  const record = useCallback(
    async (input: DefensivePlayInput) => {
      if (!user) throw new Error('Not signed in.');
      if (!input.athleteId) throw new Error('Select the athlete this play belongs to.');
      setSaving(true);
      try {
        const derived = deriveDefensivePlayMetrics(input, scaleRows);
        const { data, error } = await (supabase as any)
          .from('defensive_plays')
          .insert({
            user_id: input.athleteId,
            at_bat_id: input.atBatId,
            fielder_id: input.fielderId ?? input.athleteId,
            fielder_position: input.fielderPosition,
            ball_landing_location: input.ballLandingLocation,
            distance_to_cover: input.distanceToCoverFt,
            hang_time_sec: input.hangTimeSec,
            total_play_time_sec: input.totalPlayTimeSec,
            outcome: input.outcome,
            catch_probability: derived.catchProbability,
            oae_credit: derived.oaeCredit,
            beaten_runner_grade: derived.beatenRunnerGrade,
            missing_reason: derived.missingReason,
            // Load-bearing provenance: an evaluator's stopwatch is never
            // camera-measured, so this is always manual_entry.
            source: 'manual_entry',
            recorded_by: user.id,
          })
          .select('id')
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      } finally {
        setSaving(false);
      }
    },
    [user, scaleRows],
  );

  return { record, saving, scaleRows };
}

/** Defensive plays logged for one athlete, newest first. */
export function useAthleteDefensivePlays(athleteId: string) {
  const [rows, setRows] = useState<DefensivePlayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!athleteId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('defensive_plays')
      .select(
        'id, user_id, at_bat_id, fielder_id, fielder_position, ball_landing_location, distance_to_cover, hang_time_sec, total_play_time_sec, outcome, catch_probability, oae_credit, beaten_runner_grade, missing_reason, source, recorded_by, created_at',
      )
      .eq('user_id', athleteId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as DefensivePlayRow[]);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, reload: load };
}

export interface AtBatOption {
  id: string;
  label: string;
}

/** At-bats readable for this athlete, offered as link targets for the play. */
export function useAthleteAtBats(athleteId: string) {
  const [options, setOptions] = useState<AtBatOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!athleteId) {
      setOptions([]);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data } = await (supabase as any)
        .from('gp_at_bats')
        .select('id, inning, result, created_at')
        .eq('user_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      setOptions(
        ((data ?? []) as any[]).map((r) => ({
          id: r.id as string,
          label: `${r.inning ? `Inn ${r.inning} · ` : ''}${r.result ?? 'no result'} · ${new Date(
            r.created_at,
          ).toLocaleDateString()}`,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  return { options, loading };
}
