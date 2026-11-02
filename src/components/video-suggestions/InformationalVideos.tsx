import { useInformationalVideos, type InfoExtras } from '@/hooks/useInformationalVideos';
import type { InfoPlacement } from '@/lib/videoMoments/informational';
import { VideoPlayer } from '@/components/video-library/VideoPlayer';

const HEADING: Partial<Record<InfoPlacement, string>> = { growth: 'Keep developing', recurring: 'For your recurring findings', mind: 'Watch for this', tissue_care: 'How to do it' };

export function InformationalVideos({ placement, sport, faultKeys = [], developed = false, domain, goals, extras }: {
  placement: InfoPlacement; sport: string; faultKeys?: string[]; developed?: boolean; domain?: string; goals?: string[]; extras?: InfoExtras;
}) {
  const { videos, isError } = useInformationalVideos(placement, sport, faultKeys, developed, domain, goals, extras);
  if (isError) return <p role="alert" className="text-sm text-destructive">Couldn't load your learning videos. Try again later.</p>;
  if (!videos.length) return null;
  return <section aria-label="Learning videos" data-info-placement={placement} className="min-w-0 space-y-3">
    <h3 className="text-sm font-semibold">{HEADING[placement] ?? 'Learn from this'}</h3>
    {videos.map(video => <div key={video.id} data-info-video={video.id} className="min-w-0 space-y-2 border-b border-border pb-3">
      <h4 className="break-words text-sm font-medium">{video.title}</h4>
      <VideoPlayer videoUrl={video.video_url ?? ''} videoType={video.video_type} title={video.title} />
    </div>)}
  </section>;
}
