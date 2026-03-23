import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Video } from 'lucide-react';

interface SessionVideosDisplayProps {
  sessionId: string;
}

export function SessionVideosDisplay({ sessionId }: SessionVideosDisplayProps) {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['session-videos', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_videos')
        .select('id, storage_path, label, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        ...v,
        url: supabase.storage.from('videos').getPublicUrl(v.storage_path).data.publicUrl,
      }));
    },
    staleTime: 120_000,
  });

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] flex items-center gap-1">
        <Video className="h-3 w-3" /> Videos
      </p>
      <div className="grid gap-2">
        {videos.map((v: any) => (
          <div key={v.id} className="space-y-0.5">
            {v.label && <p className="text-[10px] text-muted-foreground capitalize">{v.label}</p>}
            <video
              src={v.url}
              controls
              preload="metadata"
              className="w-full max-w-xs rounded border border-border"
              style={{ maxHeight: 160 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
