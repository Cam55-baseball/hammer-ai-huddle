/**
 * Compact video-suggestion chips embedded inside HammerDailyPlan modality cards.
 *
 * Long-term picks (HIE weakness clusters + recent sessions) — never per-rep.
 * Athlete-initiated only; 24h per-video dismiss via localStorage so skipped
 * picks don't re-haunt the user.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVideoSuggestions, trackVideoWatched } from "@/hooks/useVideoSuggestions";
import { aggregateWeaknessClustersToTaxonomy } from "@/lib/analysisToTaxonomy";
import type { SkillDomain } from "@/lib/videoRecommendationEngine";
import type { ModalityKey } from "@/lib/hammer/prescription/dailyPlan";

const MODALITY_TO_DOMAIN: Partial<Record<ModalityKey, SkillDomain>> = {
  hitting: "hitting",
  throwing: "pitching",
  defense: "fielding",
  baserunning: "base_running",
};

const DISMISS_KEY = (id: string) => `hammer:vid-dismiss:${id}`;
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function isDismissed(videoId: string): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY(videoId));
    if (!v) return false;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function dismiss(videoId: string) {
  try {
    localStorage.setItem(DISMISS_KEY(videoId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function DailyPlanVideoChips({ modality }: { modality: ModalityKey }) {
  const { user } = useAuth();
  const skillDomain = MODALITY_TO_DOMAIN[modality];
  const [tick, setTick] = useState(0);

  const { data: signals } = useQuery({
    queryKey: ["daily-plan-chips-signals", user?.id, skillDomain],
    enabled: !!user && !!skillDomain,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user || !skillDomain) return null;
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
      return {
        weaknessClusters: snap?.weakness_clusters ?? [],
        sessions: (sessions ?? []) as any[],
      };
    },
  });

  const agg = useMemo(() => {
    if (!skillDomain || !signals) return null;
    return aggregateWeaknessClustersToTaxonomy(
      skillDomain,
      signals.weaknessClusters,
      signals.sessions,
    );
  }, [skillDomain, signals]);

  const { data: suggestions = [] } = useVideoSuggestions({
    skillDomain: skillDomain ?? "hitting",
    mode: "long_term",
    movementPatterns: agg?.movementPatterns ?? [],
    resultTags: agg?.resultTags ?? [],
    contextTags: agg?.contextTags ?? [],
    enabled: !!skillDomain && !!agg,
  });

  if (!skillDomain || suggestions.length === 0) return null;

  const visible = suggestions
    .filter((s) => !isDismissed(s.video.id))
    .slice(0, 2);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-2 space-y-1.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
        <Sparkles className="h-3 w-3" /> Hammer picks for this block
      </div>
      <div className="space-y-1.5">
        {visible.map(({ video, reasons }) => (
          <div
            key={video.id}
            className="flex gap-2 items-center rounded border bg-background/70 p-1.5"
          >
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt=""
                className="h-9 w-14 rounded object-cover shrink-0"
              />
            ) : (
              <div className="h-9 w-14 rounded bg-muted shrink-0 flex items-center justify-center">
                <Play className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium truncate">{video.title}</p>
              {reasons[0] && (
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {reasons[0]}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2 text-[10px] shrink-0"
              onClick={() => {
                if (user) trackVideoWatched(user.id, video.id, 0).catch(() => {});
                window.open(video.video_url, "_blank");
              }}
            >
              Watch
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              aria-label="Dismiss"
              onClick={() => {
                dismiss(video.id);
                setTick((t) => t + 1);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <Badge variant="outline" className="text-[9px]">
        Long-term · 24h dismiss
      </Badge>
    </div>
  );
}
