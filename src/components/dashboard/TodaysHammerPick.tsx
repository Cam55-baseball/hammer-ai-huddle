/**
 * Single highest-confidence long-term pick surfaced as a slim dashboard strip.
 *
 * Reuses the same query as LongTermVideoSuggestions — no extra fetch. Hidden
 * when no pick meets the 0.65 score floor. Athlete-initiated only.
 */
import { useQuery } from "@tanstack/react-query";
import { Play, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  aggregateWeaknessClustersToTaxonomy,
  moduleToSkillDomain,
} from "@/lib/analysisToTaxonomy";
import type { SkillDomain } from "@/lib/videoRecommendationEngine";
import {
  useVideoSuggestions,
  trackVideoWatched,
} from "@/hooks/useVideoSuggestions";

const SCORE_FLOOR = 0.65;

export function TodaysHammerPick() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["todays-hammer-pick-signals", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return null;
      const since = new Date(Date.now() - 14 * 86400000)
        .toISOString()
        .slice(0, 10);
      const [{ data: snap }, { data: sessions }] = await Promise.all([
        (supabase as any)
          .from("hie_snapshots")
          .select("weakness_clusters")
          .eq("user_id", user.id)
          .order("computed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("performance_sessions")
          .select(
            "module, session_type, drill_blocks, detected_issues, throwing_hand_used, batting_side_used",
          )
          .eq("user_id", user.id)
          .gte("session_date", since)
          .order("session_date", { ascending: false })
          .limit(20),
      ]);
      const inferred =
        moduleToSkillDomain(
          (sessions?.[0] as any)?.module ||
            (sessions?.[0] as any)?.session_type ||
            "",
        ) || "hitting";
      return {
        skillDomain: inferred as SkillDomain,
        weaknessClusters: snap?.weakness_clusters ?? [],
        sessions: (sessions ?? []) as any[],
      };
    },
  });

  const agg = data
    ? aggregateWeaknessClustersToTaxonomy(
        data.skillDomain,
        data.weaknessClusters,
        data.sessions,
      )
    : null;

  const { data: suggestions = [] } = useVideoSuggestions({
    skillDomain: data?.skillDomain ?? "hitting",
    mode: "long_term",
    movementPatterns: agg?.movementPatterns ?? [],
    resultTags: agg?.resultTags ?? [],
    contextTags: agg?.contextTags ?? [],
    enabled: !!data && !!agg,
  });

  const top = suggestions[0];
  if (!top || top.score < SCORE_FLOOR) return null;

  return (
    <Card className="p-3 flex items-center gap-3 border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
      <Sparkles className="h-5 w-5 text-primary shrink-0" />
      {top.video.thumbnail_url ? (
        <img
          src={top.video.thumbnail_url}
          alt=""
          className="h-12 w-20 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-12 w-20 rounded bg-muted shrink-0 flex items-center justify-center">
          <Play className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
          Today's Hammer pick
        </p>
        <p className="text-sm font-semibold truncate">{top.video.title}</p>
        {top.reasons[0] && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {top.reasons[0]}
          </p>
        )}
      </div>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => {
          if (user) trackVideoWatched(user.id, top.video.id, 0).catch(() => {});
          window.open(top.video.video_url, "_blank");
        }}
      >
        <Play className="h-3 w-3 mr-1" /> Watch
      </Button>
    </Card>
  );
}
