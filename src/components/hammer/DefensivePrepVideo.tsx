/**
 * Defensive prep video — inside "Before you start".
 *
 * Driven by the athlete's own fielding fault signals in the ledger, through the
 * SAME engine as every other surface: same tag matching, same per-fault
 * coverage rotation, same confidence floors. No second recommender.
 *
 * There are no fielding videos in the library yet, so the empty state carries
 * the weight: the closest foundational clip, plainly labelled as not a fix, or
 * words saying there isn't one. Never a blank shelf on a preparation tab.
 */
import { useMemo, useState } from "react";
import { Play, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFaultLedger } from "@/hooks/useFaultLedger";
import { defensivePrepTriggers } from "@/lib/hammer/defensivePrepTrigger";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { useVideoSuggestions, trackVideoWatched } from "@/hooks/useVideoSuggestions";
import { VideoThumb } from "@/components/video/VideoThumb";
import { VideoLightbox, type LightboxVideo } from "@/components/video/VideoLightbox";
import type { TagSport } from "@/lib/videoRecommendationEngine";

export function DefensivePrepVideo() {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const tagSport: TagSport = sport === "softball" ? "softball" : "baseball";
  const [playing, setPlaying] = useState<LightboxVideo | null>(null);

  const { data: ranked = [] } = useFaultLedger();

  // Owner Nov 5 round 2 Part 4: only a specific recent defensive issue triggers this.
  const triggers = useMemo(() => defensivePrepTriggers(ranked.flatMap((g) => g.signals)), [ranked]);
  const faultKeys = useMemo(() => triggers.map((t) => t.faultKey), [triggers]);

  // Layer-agnostic: the ledger stores a fault key, the engine matches it in
  // whichever layer the taxonomy actually defines it.
  const { data: suggestions = [], isLoading } = useVideoSuggestions({
    skillDomain: "fielding",
    mode: "session",
    movementPatterns: faultKeys,
    resultTags: [],
    contextTags: [],
    correctionTags: faultKeys,
    sport: tagSport,
    enabled: faultKeys.length > 0,
  });

  // No trigger, still loading, or no video matching THAT issue → nothing shows.
  if (!faultKeys.length || isLoading) return null;
  const top = suggestions.slice(0, 1);
  if (!top.length) return null;
  const because = triggers.find((t) => top[0].faultScope?.includes?.(t.faultKey))?.because ?? triggers[0].because;

  return (
    <div className="rounded-md border border-border/60 bg-card p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <div className="text-sm font-semibold leading-tight">Watch before defensive work</div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="defense-prep-because">{because}</p>
      {(
        top.map(({ video, reasons, faultScope }) => (
          <div key={video.id} className="flex gap-2.5 rounded-md border bg-background p-2">
            <VideoThumb
              videoUrl={video.video_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              className="h-14 w-20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{video.title}</p>
              {reasons[0] && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">• {reasons[0]}</p>
              )}
            </div>
            <Button
              size="sm"
              className="shrink-0 self-center"
              onClick={() => {
                if (user) trackVideoWatched(user.id, video.id, 0, faultScope).catch(() => {});
                setPlaying({
                  id: video.id,
                  title: video.title,
                  video_url: video.video_url,
                  thumbnail_url: video.thumbnail_url,
                });
              }}
            >
              <Play className="mr-1 h-3 w-3" /> Watch
            </Button>
          </div>
        ))
      )}

      <VideoLightbox video={playing} onOpenChange={(open) => !open && setPlaying(null)} />
    </div>
  );
}
