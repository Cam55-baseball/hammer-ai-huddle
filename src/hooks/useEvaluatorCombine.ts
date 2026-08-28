import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { evaluateCombineEligibility, type CombineEligibility } from '@/lib/combine/eligibility';
import type { CombineEvent, CombineSport } from '@/lib/combine/events';

export interface EvaluatorCombineContext {
  athlete_id: string;
  athlete_name: string | null;
  athlete_sport: string | null;
  tier: string | null;
  existing_session_created_at: string | null;
}

export interface CombineResultRow {
  id: string;
  session_id: string;
  event: string;
  value: number | null;
  unit: string | null;
  source: string | null;
  confidence: number | null;
  recorded_by: string | null;
  created_at: string;
}

/**
 * Evaluator-side combine context for one athlete + sport: name, tier, and
 * whether this calendar month's single attempt has already been used.
 * Backed by a security-definer lookup so an evaluator learns eligibility
 * without gaining read access to the athlete's other data.
 */
export function useEvaluatorCombineContext(athleteId: string, sport: CombineSport) {
  const [context, setContext] = useState<EvaluatorCombineContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!athleteId) {
      setContext(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('combine_evaluator_context', {
      p_athlete: athleteId,
      p_sport: sport,
    });
    if (rpcError) {
      setError(rpcError.message);
      setContext(null);
    } else {
      setContext(data as unknown as EvaluatorCombineContext);
    }
    setLoading(false);
  }, [athleteId, sport]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Monthly eligibility, decided by the shared pure rule rather than a
   * second implementation. The database trigger remains the final gate.
   */
  const eligibility: CombineEligibility | null = context
    ? evaluateCombineEligibility(
        athleteId,
        sport,
        context.existing_session_created_at
          ? [{ user_id: athleteId, sport, created_at: context.existing_session_created_at }]
          : [],
      )
    : null;

  return { context, eligibility, loading, error, reload: load };
}

export interface CombineEntryInput {
  event: CombineEvent;
  value: number;
  unit: string;
}

/** Writes a session plus its results. Every row is manual_entry provenance. */
export function useRecordCombine() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const record = useCallback(
    async (athleteId: string, sport: CombineSport, tier: string | null, entries: CombineEntryInput[]) => {
      if (!user) throw new Error('Not signed in.');
      if (entries.length === 0) throw new Error('Record at least one event before saving.');
      setSaving(true);
      try {
        const { data: session, error: sessionError } = await supabase
          .from('combine_sessions')
          .insert({
            user_id: athleteId,
            sport,
            tier_at_time: tier,
            recorded_by: user.id,
            completed_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (sessionError) throw sessionError;

        const { error: resultsError } = await supabase.from('combine_results').insert(
          entries.map((e) => ({
            session_id: (session as { id: string }).id,
            user_id: athleteId,
            event: e.event,
            value: e.value,
            unit: e.unit,
            // Load-bearing provenance: an evaluator's stopwatch is never
            // camera-measured, so this is always manual_entry.
            source: 'manual_entry' as const,
            recorded_by: user.id,
          })),
        );
        if (resultsError) throw resultsError;

        return (session as { id: string }).id;
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  return { record, saving };
}

/** Combine results for one athlete, newest first, provenance preserved. */
export function useAthleteCombineResults(athleteId: string) {
  const [rows, setRows] = useState<CombineResultRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!athleteId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('combine_results')
      .select('id, session_id, event, value, unit, source, confidence, recorded_by, created_at')
      .eq('user_id', athleteId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as CombineResultRow[]);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, reload: load };
}
