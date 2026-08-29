import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  computeHomeToFirstGrade,
  homeToFirstMetric,
  type HomeToFirstGradeResult,
} from '@/lib/baserunning/homeToFirstGrade';
import {
  defaultUnitFor,
  requiresBatterHand,
  type BaserunningSplitEvent,
} from '@/lib/baserunning/splits';
import type {
  BatterHandedness,
  ScaleReferenceRow,
} from '@/lib/defense/beatenRunnerGrade';

export interface BaserunningSplitRow {
  id: string;
  user_id: string;
  event: string;
  value: number | null;
  unit: string | null;
  batter_hand: string | null;
  source: string;
  confidence: number | null;
  missing_reason: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface BaserunningSplitInput {
  athleteId: string;
  event: BaserunningSplitEvent;
  value: number | null;
  batterHand: BatterHandedness | null;
}

/**
 * Home-to-first scouting anchors. Same two rows the defensive beaten-runner
 * grade reads — one source, so the two surfaces can never disagree.
 */
export function useHomeToFirstScaleRows() {
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
 * Grade for one stored split row. Only home-to-first is anchored in
 * `scale_reference`; every other split returns null rather than a number
 * invented from an anchor that does not exist.
 */
export function gradeForSplitRow(
  row: BaserunningSplitRow,
  scaleRows: readonly ScaleReferenceRow[],
): HomeToFirstGradeResult | null {
  if (row.event !== 'home_to_first') return null;
  const hand = row.batter_hand === 'L' ? 'L' : row.batter_hand === 'R' ? 'R' : null;
  if (!hand) return null;
  return computeHomeToFirstGrade(row.value, hand, scaleRows);
}

/** Evaluator write path. Everything logged here is manual_entry provenance. */
export function useRecordBaserunningSplit() {
  const { user } = useAuth();
  const { rows: scaleRows } = useHomeToFirstScaleRows();
  const [saving, setSaving] = useState(false);

  const record = useCallback(
    async (input: BaserunningSplitInput) => {
      if (!user) throw new Error('Not signed in.');
      if (!input.athleteId) throw new Error('Select the athlete this split belongs to.');
      if (requiresBatterHand(input.event) && !input.batterHand) {
        throw new Error('Home-to-first needs the batter-runner handedness to be graded.');
      }

      setSaving(true);
      try {
        const graded =
          input.event === 'home_to_first' && input.batterHand
            ? computeHomeToFirstGrade(input.value, input.batterHand, scaleRows)
            : null;

        const { data, error } = await (supabase as any)
          .from('baserunning_splits')
          .insert({
            user_id: input.athleteId,
            event: input.event,
            value: input.value,
            unit: defaultUnitFor(input.event),
            batter_hand: requiresBatterHand(input.event) ? input.batterHand : null,
            // A stopwatch is never camera-measured.
            source: 'manual_entry',
            confidence: null,
            missing_reason:
              input.value == null
                ? 'no_value_recorded'
                : graded && graded.missing
                  ? graded.missing_reason
                  : null,
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

/** Splits logged for one athlete, newest first. */
export function useAthleteBaserunningSplits(athleteId: string) {
  const [rows, setRows] = useState<BaserunningSplitRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!athleteId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('baserunning_splits')
      .select(
        'id, user_id, event, value, unit, batter_hand, source, confidence, missing_reason, recorded_by, created_at',
      )
      .eq('user_id', athleteId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as BaserunningSplitRow[]);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, reload: load };
}

export { homeToFirstMetric };
