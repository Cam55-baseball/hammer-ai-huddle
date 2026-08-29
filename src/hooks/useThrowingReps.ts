import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  defaultUnitFor,
  type ThrowingMetric,
  type ThrowingPositionContext,
  type ThrowingRepRow,
} from '@/lib/throwing/reps';

export type { ThrowingRepRow };

export interface ThrowingRepInput {
  athleteId: string;
  positionContext: ThrowingPositionContext;
  metric: ThrowingMetric;
  value: number | null;
}

export function useRecordThrowingRep() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const record = useCallback(
    async (input: ThrowingRepInput) => {
      if (!user) throw new Error('Not signed in.');
      if (!input.athleteId) throw new Error('Select the athlete this rep belongs to.');
      setSaving(true);
      try {
        const { data, error } = await (supabase as any)
          .from('throwing_reps')
          .insert({
            user_id: input.athleteId,
            position_context: input.positionContext,
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

  return { record, saving };
}

export function useAthleteThrowingReps(athleteId: string) {
  const [rows, setRows] = useState<ThrowingRepRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!athleteId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('throwing_reps')
      .select(
        'id, user_id, position_context, metric, value, unit, source, confidence, missing_reason, recorded_by, created_at',
      )
      .eq('user_id', athleteId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as ThrowingRepRow[]);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, reload: load };
}
