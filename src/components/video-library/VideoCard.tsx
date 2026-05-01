import { Heart, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEmbedInfo, detectPlatform } from "@/lib/videoEmbed";
import type { LibraryVideo } from "@/hooks/useVideoLibrary";

interface VideoCardProps {
  video: LibraryVideo;
  onPlay: (video: LibraryVideo) => void;
  onLike: (videoId: string) => void;
}

export function VideoCard({ video, onPlay, onLike }: VideoCardProps) {
  const info = getEmbedInfo(video.video_url);
  const thumbnail = video.thumbnail_url || info.thumbnailUrl;
  const platform = info.platform !== 'unknown' ? info.platform : detectPlatform(video.video_url);
  const platformLabel =
    platform === 'youtube' ? 'YouTube'
    : platform === 'vimeo' ? 'Vimeo'
    : platform === 'twitter' ? 'X / Twitter'
    : platform === 'tiktok' ? 'TikTok'
    : null;

  return (
    <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onPlay(video)}>
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <Play className="h-10 w-10 text-muted-foreground" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {video.tags.slice(0, 4).map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {video.tags.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{video.tags.length - 4}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onLike(video.id);
            }}
          >
            <Heart className={cn("h-3.5 w-3.5", video.is_liked && "fill-destructive text-destructive")} />
            <span className="text-xs">{video.likes_count}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
