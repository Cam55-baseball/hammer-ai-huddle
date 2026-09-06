/**
 * The correction keys the athlete's plan is currently working on — i.e. the
 * faults their recent analyses actually recorded in this skill domain.
 *
 * Used to keep recommendations pointed at where the roadmap is heading, not
 * just at the single clip in front of them. Empty until findings exist;
 * nothing is guessed or padded.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';

export function useRecentFaultKeys(domain: SkillDomain | null | undefined, days = 45) {
  const { user } = useAuth();

  return useQuery<string[]>({
    queryKey: ['recent-fault-keys', user?.id, domain, days],
    enabled: !!user && !!domain,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await (supabase as any)
        .from('analysis_fault_findings')
        .select('correction_key, created_at')
        .eq('user_id', user!.id)
        .eq('skill_domain', domain)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const keys = new Set<string>();
      for (const row of (data ?? []) as { correction_key: string | null }[]) {
        if (row.correction_key) keys.add(row.correction_key);
      }
      return Array.from(keys);
    },
  });
}
