import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  videoUrl: string | null;
  videoType: string;
  title: string;
}

export function VideoPlayer({ videoUrl, videoType, title }: VideoPlayerProps) {
  const embedUrl = useMemo(() => {
    if (!videoUrl) return null;
    if (videoType === 'youtube') {
      const match = videoUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?#]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : videoUrl;
    }
    if (videoType === 'vimeo') {
      const match = videoUrl.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : videoUrl;
    }
    return null;
  }, [videoUrl, videoType]);

  if (!videoUrl) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
        <p className="text-muted-foreground">No video available</p>
      </div>
    );
  }

  if (embedUrl && (videoType === 'youtube' || videoType === 'vimeo')) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (videoType === 'external') {
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