import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ReadinessState = 'green' | 'yellow' | 'red';

export interface ReadinessSource {
  name: string;
  score: number;
  weight: number;
  capturedAt?: string;
}

export interface ReadinessResult {
  state: ReadinessState;
  score: number;
  sources: ReadinessSource[];
  confidence: number;
  loading: boolean;
}

const stateFor = (s: number): ReadinessState =>
  s >= 70 ? 'green' : s >= 50 ? 'yellow' : 'red';

/**
 * Confidence-weighted synthesis of readiness signals across HIE,
 * physio regulation, and recent focus quizzes.
 */
export function useReadinessState(): ReadinessResult {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['readiness-state', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();

      const [hieRes, physioRes, focusRes] = await Promise.all([
        supabase
          .from('hie_snapshots')
          .select('readiness_score, computed_at')
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
      if (hieRes.data?.readiness_score != null) {
        sources.push({ name: 'HIE Readiness', score: Number(hieRes.data.readiness_score), weight: 0.5, capturedAt: hieRes.data.computed_at });
      }
      if (physioRes.data?.regulation_score != null) {
        sources.push({ name: 'Regulation Index', score: Number(physioRes.data.regulation_score), weight: 0.3, capturedAt: physioRes.data.created_at });
      }
      if (focusRes.data?.focus_score != null) {
        sources.push({ name: 'Focus Quiz', score: Number(focusRes.data.focus_score), weight: 0.2, capturedAt: focusRes.data.created_at });
      }

      const totalWeight = sources.reduce((s, x) => s + x.weight, 0) || 1;
      sources.forEach(s => { s.weight = s.weight / totalWeight; });
      const score = sources.length
        ? Math.round(sources.reduce((acc, s) => acc + s.score * s.weight, 0))
        : 60;
      const confidence = Math.min(1, sources.length / 3);

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
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const data = query.data;
  return {
    state: stateFor(data?.score ?? 60),
    score: data?.score ?? 60,
    sources: data?.sources ?? [],
    confidence: data?.confidence ?? 0,
    loading: query.isLoading,
  };
}
