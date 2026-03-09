import { Heart } from "lucide-react";
import { VideoCard } from "./VideoCard";
import type { LibraryVideo } from "@/hooks/useVideoLibrary";

interface SavedVideosProps {
  videos: LibraryVideo[];
  onPlay: (video: LibraryVideo) => void;
  onLike: (videoId: string) => void;
}

export function SavedVideos({ videos, onPlay, onLike }: SavedVideosProps) {
  const saved = videos.filter(v => v.is_liked);

  if (saved.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        <h3 className="font-semibold text-lg mb-1">No saved videos</h3>
        <p className="text-sm text-muted-foreground">Like videos to save them here for quick access.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {saved.map(video => (
        <VideoCard key={video.id} video={video} onPlay={onPlay} onLike={onLike} />
      ))}
    </div>
  );
}
