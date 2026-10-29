import { useInformationalVideos } from '@/hooks/useInformationalVideos';
import type { InfoPlacement } from '@/lib/videoMoments/informational';
import { VideoPlayer } from '@/components/video-library/VideoPlayer';

export function InformationalVideos({ placement, sport, faultKeys = [], developed = false, domain }: {
  placement: InfoPlacement; sport: string; faultKeys?: string[]; developed?: boolean; domain?: string;
}) {
  const { videos, isError } = useInformationalVideos(placement, sport, faultKeys, developed, domain);
  if (isError) return <p role="alert" className="text-sm text-destructive">Couldn't load your learning videos. Try again later.</p>;
  if (!videos.length) return null;
  return <section aria-label="Learning videos" data-info-placement={placement} className="min-w-0 space-y-3">
    <h3 className="text-sm font-semibold">{placement === 'growth' ? 'Keep developing' : placement === 'recurring' ? 'For your recurring findings' : 'Learn from this'}</h3>
    {videos.map(video => <div key={video.id} data-info-video={video.id} className="min-w-0 space-y-2 border-b border-border pb-3">
      <h4 className="break-words text-sm font-medium">{video.title}</h4>
      <VideoPlayer videoUrl={video.video_url ?? ''} videoType={video.video_type} title={video.title} />
    </div>)}
  </section>;
}