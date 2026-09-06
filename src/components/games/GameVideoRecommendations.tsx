import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { useVideoSuggestions, trackVideoWatched } from "@/hooks/useVideoSuggestions";
import { VideoThumb } from "@/components/video/VideoThumb";
import { useVideoLightbox } from "@/components/video/useVideoLightbox";
import {
  atBatsToSignals,
  baserunToSignals,
  defensePlaysToSignals,
  pitchesToSignals,
  type GameSignals,
} from "@/lib/games/gameOutcomesToTaxonomy";

/**
 * What happened in the game, turned into things to watch.
 * Only real logged outcomes drive this — an empty game shows nothing.
 */
export function GameVideoRecommendations({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const { sport } = useSportTheme();

  const { data: signals } = useQuery({
    queryKey: ["game-video-signals", gameId, sport],
    enabled: !!gameId && !!user,
    queryFn: async (): Promise<GameSignals[]> => {
      const [defense, pitches, atBats, baserun] = await Promise.all([
        supabase.from("gp_defense_plays").select("position, play_type, result, error_flag, pop_time_sec").eq("game_id", gameId),
        supabase.from("gp_pitches").select("perspective, pitch_type, result").eq("game_id", gameId),
        supabase.from("gp_at_bats").select("result, contact_quality, count_balls, count_strikes, runners_on").eq("game_id", gameId),
        supabase.from("gp_baserun_events").select("event_type, success").eq("game_id", gameId),
      ]);
      const out: GameSignals[] = [];
      const d = defensePlaysToSignals(defense.data ?? []);
      if (d) out.push(d);
      const p = pitchesToSignals(pitches.data ?? [], sport === "softball" ? "softball" : "baseball");
      if (p) out.push(p);
      const a = atBatsToSignals(atBats.data ?? []);
      if (a) out.push(a);
      const b = baserunToSignals(baserun.data ?? []);
      if (b) out.push(b);
      return out;
    },
  });

  if (!signals || signals.length === 0) return null;

  return (
    <div className="space-y-3">
      {signals.map((s) => (
        <GameDomainRecommendations key={s.skillDomain} signals={s} />
      ))}
    </div>
  );
}

function GameDomainRecommendations({ signals }: { signals: GameSignals }) {
  const { user } = useAuth();
  const { open: openVideo, element: videoLightbox } = useVideoLightbox();

  const { data: results = [] } = useVideoSuggestions({
    skillDomain: signals.skillDomain,
    mode: "session",
    movementPatterns: signals.movementPatterns,
    resultTags: signals.resultTags,
    contextTags: signals.contextTags,
    correctionTags: signals.correctionTags,
  });

  const heading = useMemo(() => {
    switch (signals.skillDomain) {
      case "fielding": return "From your defense this game";
      case "pitching": return "From your pitches this game";
      case "hitting": return "From your at-bats this game";
      case "base_running": return "From your base running this game";
      default: return "From this game";
    }
  }, [signals.skillDomain]);

  if (results.length === 0) return null;

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{heading}</h3>
      </div>
      <p className="text-[11px] text-muted-foreground">{signals.evidence.join(" · ")}</p>
      <div className="space-y-2">
        {results.map(({ video, reasons, relevance }) => (
          <div key={video.id} className="flex gap-3 p-2 rounded-md border bg-card">
            <VideoThumb
              videoUrl={video.video_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              className="h-16 w-24"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{video.title}</p>
                {relevance === "general" && (
                  <Badge variant="outline" className="text-[9px] shrink-0">General</Badge>
                )}
              </div>
              <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                {reasons.slice(0, 2).map((r, i) => (
                  <li key={i} className="line-clamp-1">• {r}</li>
                ))}
              </ul>
            </div>
            <Button
              size="sm"
              className="self-center shrink-0"
              onClick={() => {
                if (user) trackVideoWatched(user.id, video.id, 0).catch(() => {});
                openVideo(video);
              }}
            >
              <Play className="h-3 w-3 mr-1" /> Watch
            </Button>
          </div>
        ))}
      </div>
      {videoLightbox}
    </Card>
  );
}
