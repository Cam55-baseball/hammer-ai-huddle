import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/video-library/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface VideoDetail {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: string;
  tags: string[];
  sport: string[];
  category: string | null;
  likes_count: number;
  created_at: string;
}

const VideoLibraryPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('library_videos')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setVideo(data as VideoDetail);
        setLikesCount(data.likes_count);
      }

      if (user) {
        const { data: like } = await supabase
          .from('library_video_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('video_id', id)
          .maybeSingle();
        setIsLiked(!!like);

        // Track view
        await supabase.from('library_video_analytics').insert({
          video_id: id,
          user_id: user.id,
          action: 'view',
        });
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleLike = async () => {
    if (!user || !id) return;
    if (isLiked) {
      await supabase.from('library_video_likes').delete().eq('user_id', user.id).eq('video_id', id);
      setIsLiked(false);
      setLikesCount(c => c - 1);
    } else {
      await supabase.from('library_video_likes').insert({ user_id: user.id, video_id: id });
      setIsLiked(true);
      setLikesCount(c => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Video not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/video-library')}>
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/video-library')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Button>

        <VideoPlayer videoUrl={video.video_url} videoType={video.video_type} title={video.title} />

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold">{video.title}</h1>
            <Button variant="outline" size="sm" onClick={handleLike} className="shrink-0 gap-1.5">
              <Heart className={cn("h-4 w-4", isLiked && "fill-destructive text-destructive")} />
              {likesCount}
            </Button>
          </div>

          {video.description && (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{video.description}</p>
            </Card>
          )}

          <div className="flex flex-wrap gap-1.5">
            {video.sport.map(s => (
              <Badge key={s} variant="default" className="capitalize">{s}</Badge>
            ))}
            {video.category && <Badge variant="secondary" className="capitalize">{video.category}</Badge>}
            {video.tags.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLibraryPlayer;
