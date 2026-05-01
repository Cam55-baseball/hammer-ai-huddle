import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEmbedInfo } from "@/lib/videoEmbed";

interface VideoPlayerProps {
  videoUrl: string | null;
  videoType: string;
  title: string;
}

export function VideoPlayer({ videoUrl, videoType, title }: VideoPlayerProps) {
  const info = useMemo(() => getEmbedInfo(videoUrl), [videoUrl]);

  if (!videoUrl) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
        <p className="text-muted-foreground">No video available</p>
      </div>
    );
  }

  // Auto-detected platform takes priority over the stored video_type so existing
  // rows tagged 'external' for X / TikTok start playing immediately.
  if (info.platform === 'youtube' || info.platform === 'vimeo') {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={info.embedUrl!}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (info.platform === 'twitter' || info.platform === 'tiktok') {
    return (
      <div className="space-y-2">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            src={info.embedUrl!}
            title={title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
            allowFullScreen
            // Twitter & TikTok widgets need scripts from their own origin — sandboxing
            // would block the embedded video, so we leave the iframe unsandboxed.
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open original
          </Button>
        </div>
      </div>
    );
  }

  // Stored as upload — direct video file
  if (videoType === 'upload') {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Truly unknown external URL — fall back to open-in-new-tab
  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-muted flex flex-col items-center justify-center gap-4 p-6 text-center">
      <ExternalLink className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[300px]">{videoUrl}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        Open in New Tab
      </Button>
    </div>
  );
}
