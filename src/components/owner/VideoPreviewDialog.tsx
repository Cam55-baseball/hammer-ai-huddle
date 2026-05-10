import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LibraryVideo } from "@/hooks/useVideoLibrary";

interface VideoPreviewDialogProps {
  video: LibraryVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Owner-only quick preview of a library video.
 * Honors the video URL integrity rule (trim + null guard) and the
 * professional playback standard (controls, preload metadata, no autoplay).
 */
export function VideoPreviewDialog({ video, open, onOpenChange }: VideoPreviewDialogProps) {
  const url = video?.video_url?.trim() ? video.video_url : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{video?.title ?? "Preview"}</DialogTitle>
        </DialogHeader>

        {url ? (
          <div className="aspect-video w-full bg-black rounded-md overflow-hidden">
            <video
              key={url}
              src={url}
              controls
              preload="metadata"
              poster={video?.thumbnail_url ?? undefined}
              className="w-full h-full"
            />
          </div>
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
