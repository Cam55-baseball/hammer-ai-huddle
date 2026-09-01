import { useLandingDemoVideo } from "@/hooks/useLandingDemoVideo";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import { Badge } from "@/components/ui/badge";

/**
 * Landing-page demo video slot. Renders inline (plays in-page).
 * - Hidden entirely for public visitors when no visible video exists.
 * - Owners always see the current video, with a "Hidden from public" badge
 *   when it's toggled off, so they can preview before publishing.
 */
export function LandingDemoVideo() {
  const { isOwner } = useOwnerAccess();
  // Owners see hidden videos too so they can preview.
  const { video, loading, errored } = useLandingDemoVideo(isOwner);

  if (loading) return null;
  if (!video) {
    // A failed lookup is visibly different from "no video configured" —
    // silence here is exactly how the missing demo went unnoticed before.
    if (!errored) return null;
    return (
      <div className="max-w-2xl mx-auto pt-2">
        <div className="rounded-xl border border-border bg-muted/40 aspect-video flex items-center justify-center text-center p-6">
          <p className="text-sm text-muted-foreground">
            The demo video can't be loaded right now. Please refresh in a moment.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto pt-2">
      <div className="rounded-xl overflow-hidden border border-border bg-card shadow-lg">
        <VideoPlayer
          videoUrl={video.video_url}
          videoType={video.video_type}
          posterUrl={video.poster_url}
          title={video.title ?? "Hammers Modality demo"}
        />
      </div>
      {isOwner && !video.is_visible && (
        <div className="flex justify-center pt-2">
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/40">
            Hidden from public — only you can see this preview
          </Badge>
        </div>
      )}
    </div>
  );
}
