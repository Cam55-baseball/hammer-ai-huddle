import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import type { LibraryVideo } from "@/hooks/useVideoLibrary";

interface VideoPreviewDialogProps {
  video: LibraryVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Owner-only quick preview of a library video.
 * Delegates to <VideoPlayer> so YouTube / Vimeo / X / TikTok / direct uploads
 * all play correctly with the right embed strategy.
 */
export function VideoPreviewDialog({ video, open, onOpenChange }: VideoPreviewDialogProps) {
  const hasUrl = !!video?.video_url?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{video?.title ?? "Preview"}</DialogTitle>
          <DialogDescription className="sr-only">Video preview</DialogDescription>
        </DialogHeader>

        {hasUrl && video ? (
          <VideoPlayer
            videoUrl={video.video_url}
            videoType={video.video_type}
            title={video.title}
          />
        ) : (
          <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
            No video file attached
          </div>
        )}

        {video?.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">{video.description}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
