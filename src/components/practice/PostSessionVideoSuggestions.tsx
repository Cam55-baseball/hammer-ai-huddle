import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { aggregateSessionToTaxonomy } from '@/lib/analysisToTaxonomy';
import { VideoSuggestionsPanel } from '@/components/video-suggestions/VideoSuggestionsPanel';

interface Props {
  sessionId: string;
}

/**
 * Post-session Hammer video picks. Renders for every saved session.
 * Driven by the just-completed session's drill blocks, outcomes, and context —
 * NEVER fires per-rep. This is the post-session surface only.
 */
export function PostSessionVideoSuggestions({ sessionId }: Props) {
  const { data: session, isLoading } = useQuery({
    queryKey: ['post-session-video-signals', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, module, session_type, drill_blocks, detected_issues, throwing_hand_used, batting_side_used')
        .eq('id', sessionId)
        .maybeSingle();
      if (error) throw error;
      // session_context lives on the row but TS types may not include it; fetch raw
      const { data: ctxRow } = await (supabase as any)
        .from('performance_sessions')
        .select('session_context')
        .eq('id', sessionId)
        .maybeSingle();
      return { ...(data as any), session_context: ctxRow?.session_context ?? null };
    },
    staleTime: 30_000,
  });

  if (isLoading || !session) {
    return (
      <Card>
        <CardContent className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading Hammer picks…
        </CardContent>
      </Card>
    );
  }

  const agg = aggregateSessionToTaxonomy(session);

  if (!agg.skillDomain || (agg.movementPatterns.length + agg.resultTags.length === 0)) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Hammer Picks for You
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No targeted picks this session — clean work.
        </CardContent>
      </Card>
    );
  }

  return (
    <VideoSuggestionsPanel
      skillDomain={agg.skillDomain}
      mode="session"
      movementPatterns={agg.movementPatterns}
      resultTags={agg.resultTags}
      contextTags={agg.contextTags}
      title="Hammer Picks for You"
    />
  );
}
