import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import { isDirectVideoFile } from "@/lib/videoEmbed";
import { resolveThumbnailUrl } from "@/lib/videoThumbnail";

export interface LightboxVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
}

interface Props {
  video: LightboxVideo | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Plays a video INSIDE the app. Nothing here navigates the browser away, so
 * closing returns the athlete to exactly the page and scroll position they
 * were on — same analysis, same session.
 */
export function VideoLightbox({ video, onOpenChange }: Props) {
  return (
    <Dialog open={Boolean(video)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">{video?.title ?? "Video"}</DialogTitle>
        </DialogHeader>
        {video && (
          <VideoPlayer
            videoUrl={video.video_url}
            videoType={isDirectVideoFile(video.video_url) ? "upload" : "external"}
            title={video.title}
            posterUrl={resolveThumbnailUrl(video)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
