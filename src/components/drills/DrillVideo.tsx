import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import { drillVideoFromUrl, PLATFORM_NAME } from "@/lib/prescription/drillVideoSource";

/**
 * One drill video: our own upload plays in our player; a supported platform plays ONLY in
 * its official embed; any other link is a "Watch on [site]" button that opens outside.
 */
export function DrillVideo({ url, title }: { url: string | null | undefined; title: string }) {
  const src = drillVideoFromUrl(url);
  if (!src || !url) return null;
  if (src.kind === "upload") return <VideoPlayer videoUrl={url} videoType="upload" title={title} />;
  if (src.kind === "external") {
    return (
      <Button variant="outline" size="sm" onClick={() => window.open(src.url, "_blank", "noopener,noreferrer")}>
        <ExternalLink className="mr-1 h-4 w-4" aria-hidden /> Watch on {src.siteName}
      </Button>
    );
  }
  const tall = src.kind === "tiktok" || src.kind === "instagram" || src.kind === "x";
  return (
    <div className="space-y-1">
      <div className={`${tall ? "aspect-[9/16] max-h-[640px] mx-auto max-w-sm" : "aspect-video"} overflow-hidden rounded-lg bg-muted`}>
        <iframe
          src={src.embedUrl}
          title={`${title} — ${PLATFORM_NAME[src.kind]}`}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <p className="text-xs text-muted-foreground">Video on {PLATFORM_NAME[src.kind]}</p>
    </div>
  );
}
