import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  aggregateWeaknessClustersToTaxonomy,
  moduleToSkillDomain,
} from '@/lib/analysisToTaxonomy';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';
import { VideoSuggestionsPanel } from '@/components/video-suggestions/VideoSuggestionsPanel';

interface Props {
  /** Optional override; defaults to inferring from user's recent sessions. */
  skillDomain?: SkillDomain;
}

/**
 * Long-term Hammer video picks. Surfaces on the dashboard.
 * Driven by the latest HIE snapshot's weakness_clusters + a 14-day rolling
 * roll-up of session signals. NEVER fires per-rep.
 */
export function LongTermVideoSuggestions({ skillDomain: domainProp }: Props) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['long-term-video-signals', user?.id, domainProp],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return null;
      const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

      const [{ data: snap }, { data: sessions }] = await Promise.all([
        (supabase as any)
          .from('hie_snapshots')
          .select('weakness_clusters, sport')
          .eq('user_id', user.id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('performance_sessions')
          .select('module, session_type, drill_blocks, detected_issues, throwing_hand_used, batting_side_used')
          .eq('user_id', user.id)
          .gte('session_date', since)
          .order('session_date', { ascending: false })
          .limit(20),
      ]);

      // Infer skill domain from most recent session module if not provided
      const inferred =
        domainProp ||
        moduleToSkillDomain((sessions?.[0] as any)?.module || (sessions?.[0] as any)?.session_type || '') ||
        'hitting';

      return {
        skillDomain: inferred as SkillDomain,
        weaknessClusters: snap?.weakness_clusters ?? [],
        sessions: (sessions ?? []) as any[],
      };
    },
  });

  if (isLoading || !data) return null;

  const agg = aggregateWeaknessClustersToTaxonomy(
    data.skillDomain,
    data.weaknessClusters,
    data.sessions,
  );

  if (agg.movementPatterns.length + agg.resultTags.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Develop This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Log a few more sessions and Hammer will queue long-term picks here.
        </CardContent>
      </Card>
    );
  }

  return (
    <VideoSuggestionsPanel
      skillDomain={data.skillDomain}
      mode="long_term"
      movementPatterns={agg.movementPatterns}
      resultTags={agg.resultTags}
      contextTags={agg.contextTags}
      title="Develop This Week"
    />
  );
}
