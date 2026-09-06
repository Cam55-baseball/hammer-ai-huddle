import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDirectVideoFile, firstFrameSrc } from "@/lib/videoEmbed";
import { resolveThumbnailUrl, platformLabel } from "@/lib/videoThumbnail";

interface Props {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  className?: string;
}

/**
 * Shared cover image for a video. Stored poster → platform-derived image →
 * first frame of a self-hosted clip → a clean labelled placeholder.
 * A broken image is never shown.
 */
export function VideoThumb({ videoUrl, thumbnailUrl, title, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const resolved = resolveThumbnailUrl({ thumbnail_url: thumbnailUrl, video_url: videoUrl });
  const label = platformLabel(videoUrl);

  const box = cn("relative overflow-hidden rounded bg-muted shrink-0", className);

  if (resolved && !imgFailed) {
    return (
      <div className={box}>
        <img
          src={resolved}
          alt={title ? `Cover image for ${title}` : ""}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  if (!frameFailed && isDirectVideoFile(videoUrl)) {
    return (
      <div className={box}>
        <video
          src={firstFrameSrc(videoUrl!)}
          className="h-full w-full object-cover pointer-events-none"
          preload="metadata"
          muted
          playsInline
          aria-label={title}
          onError={() => setFrameFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(box, "flex flex-col items-center justify-center gap-1 text-muted-foreground")}>
      <Play className="h-5 w-5" />
      {label && <span className="text-[9px] font-medium uppercase tracking-wide">{label}</span>}
    </div>
  );
}
