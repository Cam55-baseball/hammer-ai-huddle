import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { planFaultContext, type PlanClip } from '@/lib/prescription/planFaultContext';
import type { FaultSignal } from '@/lib/wic/faultLedger/ranking';

/** Self-owned source read; never use the non-sport aggregated ledger alone. */
export function usePlanFaultContext(sport: 'baseball' | 'softball') {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['plan-fault-context', user?.id, sport], enabled: Boolean(user?.id), staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) throw new Error('Sign in to read analysis history.');
      const [signals, findings, clips] = await Promise.all([
        supabase.from('wk_fault_signals').select('id,user_id,source,fault_key,root_pattern_id,discipline,confidence,sample_size,severity,evidence,observed_at')
          .eq('user_id', user.id).eq('source', 'video_analysis').order('observed_at', { ascending: false }).limit(501),
        supabase.from('analysis_fault_findings').select('id,user_id,sport,skill_domain,fault_key,root_pattern_key,created_at,video_id')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(501),
        supabase.rpc('get_my_plan_clip_evidence', { p_sport: sport }),
      ]);
      if (signals.error) throw signals.error;
      if (findings.error) throw findings.error;
      if (clips.error) throw clips.error;
      if ([signals.data, findings.data, clips.data].some(rows => (rows?.length ?? 0) >= 501)) throw new Error('Complete analysis history is unavailable.');
      const evidence: PlanClip[] = (clips.data ?? []).map(c => {
        const violations = c.violations;
        return { video_id: c.id, user_id: c.user_id, sport: c.sport, module: c.module, created_at: c.created_at,
          violations: violations && typeof violations === 'object' && !Array.isArray(violations) ? violations : null };
      });
      return planFaultContext((signals.data ?? []) as FaultSignal[], findings.data ?? [], evidence, user.id, sport);
    },
  });
}