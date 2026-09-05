/**
 * Reads the athlete's persisted fault findings and correlates them into root
 * movement patterns. Empty until the coaching stage has written findings for
 * at least one analysis — nothing here is back-filled or guessed.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  correlateRootPatterns,
  type FaultFinding,
  type RootPatternGroup,
} from '@/lib/analysis/crossDomainFaults';

export function useCrossDomainFaults(enabled = true) {
  const { user } = useAuth();

  return useQuery<RootPatternGroup[]>({
    queryKey: ['cross-domain-faults', user?.id],
    enabled: enabled && !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('analysis_fault_findings')
        .select('id, video_id, skill_domain, sport, fault_key, movement_key, correction_key, root_pattern_key, evidence, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const findings = (data ?? []) as FaultFinding[];

      // Latest analysis per domain, including runs that flagged nothing —
      // that is what makes "cleared" a real observation rather than silence.
      const { data: runs } = await supabase
        .from('videos')
        .select('module, created_at')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(200);

      const latestByDomain = new Map<string, string>();
      (runs ?? []).forEach((r: { module: string | null; created_at: string }) => {
        if (!r.module) return;
        if (!latestByDomain.has(r.module)) latestByDomain.set(r.module, r.created_at);
      });

      return correlateRootPatterns(findings, latestByDomain);
    },
  });
}
