import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  defaultUnitFor,
  isScaleGraded,
  type CatchingMetric,
  type CatchingRepRow,
} from '@/lib/catching/reps';
import {
  CATCHER_POP_TIME_METRIC,
  computePopTimeGrade,
} from '@/lib/catching/popTimeGrade';
import type { ScaleReferenceRow } from '@/lib/defense/beatenRunnerGrade';

export type { CatchingRepRow };

export interface CatchingRepInput {
  athleteId: string;
  metric: CatchingMetric;
  value: number | null;
}

/** Pop-time anchors, the only catching metric anchored in `scale_reference`. */
export function usePopTimeScaleRows() {
  const [rows, setRows] = useState<ScaleReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase as any)
        .from('scale_reference')
        .select('metric, direction, floor_value, avg_value, record_value')
        .eq('metric', CATCHER_POP_TIME_METRIC);
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

/** Grade for one stored rep. Only pop time has anchors; others return null. */
export function gradeForCatchingRep(
  row: CatchingRepRow,
  scaleRows: readonly ScaleReferenceRow[],
) {
  if (!isScaleGraded(row.metric)) return null;
  return computePopTimeGrade(row.value, scaleRows);
}

export function useRecordCatchingRep() {
  const { user } = useAuth();
  const { rows: scaleRows } = usePopTimeScaleRows();
  const [saving, setSaving] = useState(false);

  const record = useCallback(
    async (input: CatchingRepInput) => {
      if (!user) throw new Error('Not signed in.');
      if (!input.athleteId) throw new Error('Select the athlete this rep belongs to.');
      setSaving(true);
      try {
        const { data, error } = await (supabase as any)
          .from('catching_reps')
          .insert({
            user_id: input.athleteId,
            metric: input.metric,
            value: input.value,
            unit: defaultUnitFor(input.metric),
            source: 'manual_entry',
            confidence: null,
            missing_reason: input.value == null ? 'no_value_recorded' : null,
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
    [user],
  );

  return { record, saving, scaleRows };
}

export function useAthleteCatchingReps(athleteId: string) {
  const [rows, setRows] = useState<CatchingRepRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!athleteId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('catching_reps')
      .select(
        'id, user_id, metric, value, unit, source, confidence, missing_reason, recorded_by, created_at',
      )
      .eq('user_id', athleteId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as CatchingRepRow[]);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, reload: load };
}
