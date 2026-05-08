import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ReadinessState = 'green' | 'yellow' | 'red' | 'unknown';

export interface ReadinessSource {
  name: string;
  score: number;
  weight: number;
  capturedAt?: string;
}

export interface ReadinessResult {
  state: ReadinessState;
  score: number | null;
  sources: ReadinessSource[];
  confidence: number;
  hasSignal: boolean;
  loading: boolean;
}

const stateFor = (s: number): Exclude<ReadinessState, 'unknown'> =>
  s >= 70 ? 'green' : s >= 50 ? 'yellow' : 'red';

// Freshness windows per source (ms). Stale rows are dropped from the composite
// so users don't see a never-changing number based on weeks-old data.
const HIE_MAX_AGE_MS = 48 * 3600 * 1000;
const PHYSIO_MAX_AGE_MS = 36 * 3600 * 1000;
const FOCUS_MAX_AGE_MS = 36 * 3600 * 1000;

const isFresh = (iso: string | null | undefined, maxAgeMs: number) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= maxAgeMs;
};

/**
 * Confidence-weighted synthesis of readiness signals across HIE,
 * physio regulation, and recent focus quizzes.
 *
 * Behavior:
 * - Only fresh sources contribute (see *_MAX_AGE_MS).
 * - When no fresh source exists, score is null and state is 'unknown'.
 *   The UI must render a neutral "set up" state instead of a fake 60.
 * - Confidence < 0.3 (i.e. only the low-weight Focus Quiz) is treated as
 *   insufficient — score is suppressed so a single self-report can't masquerade
 *   as a full readiness reading.
 */
export function useReadinessState(): ReadinessResult {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['readiness-state', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const since = new Date(Date.now() - FOCUS_MAX_AGE_MS).toISOString();

      const [hieRes, physioRes, focusRes] = await Promise.all([
        supabase
          .from('hie_snapshots')
          .select('readiness_score, training_readiness_score, computed_at')
          .eq('user_id', user.id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from('physio_daily_reports')
          .select('regulation_score, report_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from('vault_focus_quizzes')
          .select('focus_score, created_at')
          .eq('user_id', user.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const sources: ReadinessSource[] = [];
      const hieSnap = hieRes.data as { readiness_score: number | null; training_readiness_score: number | null; computed_at: string } | null;
      if (
        hieSnap?.readiness_score != null &&
        isFresh(hieSnap.computed_at, HIE_MAX_AGE_MS)
      ) {
        sources.push({
          name: 'HIE Subjective',
          score: Number(hieSnap.readiness_score),
          weight: 0.30,
          capturedAt: hieSnap.computed_at,
        });
      }
      if (
        hieSnap?.training_readiness_score != null &&
        isFresh(hieSnap.computed_at, HIE_MAX_AGE_MS)
      ) {
        sources.push({
          name: 'Training Load',
          score: Number(hieSnap.training_readiness_score),
          weight: 0.30,
          capturedAt: hieSnap.computed_at,
        });
      }
      if (
        physioRes.data?.regulation_score != null &&
        isFresh(physioRes.data.created_at, PHYSIO_MAX_AGE_MS)
      ) {
        sources.push({
          name: 'Regulation Index',
          score: Number(physioRes.data.regulation_score),
          weight: 0.25,
          capturedAt: physioRes.data.created_at,
        });
      }
      if (
        focusRes.data?.focus_score != null &&
        isFresh(focusRes.data.created_at, FOCUS_MAX_AGE_MS)
      ) {
        sources.push({
          name: 'Focus Quiz',
          score: Number(focusRes.data.focus_score),
          weight: 0.15,
          capturedAt: focusRes.data.created_at,
        });
      }

      // Confidence is computed from RAW (pre-renormalized) weights so a single
      // low-weight source doesn't artificially look "100% confident".
      const rawWeightSum = sources.reduce((s, x) => s + x.weight, 0);
      const confidence = Math.min(1, rawWeightSum); // raw weights sum to 1.0 if all 3 present

      // Renormalize for the weighted average display.
      const totalWeight = rawWeightSum || 1;
      sources.forEach(s => { s.weight = s.weight / totalWeight; });

      const score = sources.length
        ? Math.round(sources.reduce((acc, s) => acc + s.score * s.weight, 0))
        : null;

      return { score, sources, confidence };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`readiness-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hie_snapshots', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['readiness-state', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'physio_daily_reports', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['readiness-state', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vault_focus_quizzes', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['readiness-state', user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const data = query.data;
  const score = data?.score ?? null;
  const confidence = data?.confidence ?? 0;
  const sources = data?.sources ?? [];
  // Require at least HIE (0.5) OR HIE+Focus / Regulation+anything to display a number.
  const hasSignal = score !== null && confidence >= 0.3;

  return {
    state: hasSignal ? stateFor(score!) : 'unknown',
    score: hasSignal ? score : null,
    sources,
    confidence,
    hasSignal,
    loading: query.isLoading,
  };
}
