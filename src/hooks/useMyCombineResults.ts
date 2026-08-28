import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CombineResultRow } from '@/hooks/useEvaluatorCombine';

export interface CombineSessionRow {
  id: string;
  sport: string | null;
  tier_at_time: string | null;
  recorded_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CombineSessionGroup {
  session: CombineSessionRow;
  results: CombineResultRow[];
}

/**
 * Read-only combine history for one athlete, grouped by session.
 * Provenance is carried through untouched — a result recorded by an
 * evaluator's stopwatch stays `manual_entry` on the athlete's own view.
 */
export function useMyCombineResults(athleteId: string) {
  const [groups, setGroups] = useState<CombineSessionGroup[]>([]);
  const [orphanResults, setOrphanResults] = useState<CombineResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!athleteId) {
      setGroups([]);
      setOrphanResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [sessionsRes, resultsRes] = await Promise.all([
      supabase
        .from('combine_sessions')
        .select('id, sport, tier_at_time, recorded_by, completed_at, created_at')
        .eq('user_id', athleteId)
        .order('created_at', { ascending: false }),
      supabase
        .from('combine_results')
        .select('id, session_id, event, value, unit, source, confidence, recorded_by, created_at')
        .eq('user_id', athleteId)
        .order('created_at', { ascending: false }),
    ]);

    const sessions = (sessionsRes.data ?? []) as CombineSessionRow[];
    const results = (resultsRes.data ?? []) as CombineResultRow[];
    const known = new Set(sessions.map((s) => s.id));

    setGroups(
      sessions.map((session) => ({
        session,
        results: results.filter((r) => r.session_id === session.id),
      })),
    );
    // A result whose session row isn't readable is shown, not hidden — the
    // measurement happened even if its session context is unavailable.
    setOrphanResults(results.filter((r) => !known.has(r.session_id)));
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { groups, orphanResults, loading, reload: load };
}
