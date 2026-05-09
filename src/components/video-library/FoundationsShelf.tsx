import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFoundationVideos } from '@/hooks/useFoundationVideos';
import { FOUNDATION_LABELS, TRIGGER_REASONS, type FoundationTrigger } from '@/lib/foundationVideos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  /** When false, hide the shelf if there are no active triggers (avoid permanent clutter). */
  showWhenIdle?: boolean;
}

function shelfHeadline(triggers: FoundationTrigger[]): { title: string; subtitle: string } {
  if (triggers.length === 0) {
    return {
      title: 'Return to your blueprint',
      subtitle: 'Long-form philosophy and mechanics primers — refresh your base anytime.',
    };
  }
  const top = triggers[0];
  return {
    title: 'Return to your blueprint',
    subtitle: TRIGGER_REASONS[top],
  };
}

export function FoundationsShelf({ showWhenIdle = false }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { results, activeTriggers, loading } = useFoundationVideos({ limit: 4 });
  const shownRef = useRef<Set<string>>(new Set());

  // Telemetry: log shown rows once per video per mount.
  useEffect(() => {
    if (!user || results.length === 0) return;
    const fresh = results.filter(r => !shownRef.current.has(r.video.id));
    if (fresh.length === 0) return;
    fresh.forEach(r => shownRef.current.add(r.video.id));
    void (supabase as any).from('foundation_video_outcomes').insert(
      fresh.map(r => ({
        user_id: user.id,
        video_id: r.video.id,
        trigger_keys: r.matchedTriggers,
      })),
    );
  }, [results, user]);

  if (loading) {
    return (
      <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="aspect-video rounded-md" />
          ))}
        </div>
      </Card>
    );
  }

  if (results.length === 0) return null;
  if (!showWhenIdle && activeTriggers.length === 0) return null;

  const head = shelfHeadline(activeTriggers);

  const open = (videoId: string) => {
    if (user) {
      void (supabase as any)
        .from('foundation_video_outcomes')
        .update({ clicked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .is('clicked_at', null);
      try {
        new BroadcastChannel('data-sync').postMessage({ type: 'foundation_outcome' });
      } catch { /* noop */ }
    }
    navigate(`/video-library/${videoId}`);
  };

  return (
    <Card className="p-4 space-y-3 border-primary/30 bg-primary/5" aria-label="Foundation videos">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            {head.title}
          </h2>
          <p className="text-[11px] text-muted-foreground">{head.subtitle}</p>
        </div>
        {activeTriggers.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label="Active triggers">
            {activeTriggers.slice(0, 3).map(t => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {FOUNDATION_LABELS.trigger[t]}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {results.map(r => (
          <button
            key={r.video.id}
            type="button"
            onClick={() => open(r.video.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open(r.video.id);
              }
            }}
            aria-label={`Play foundation video: ${r.video.title}`}
            className="group text-left rounded-md border bg-card hover:border-primary/50 focus-visible:border-primary transition-colors overflow-hidden"
          >
            <div className="aspect-video bg-muted relative">
              {r.video.thumbnail_url ? (
                <img src={r.video.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                  <BookOpen className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 bg-black/30 transition-opacity">
                <Play className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
            </div>
            <div className="p-2 space-y-1">
              <p className="text-xs font-semibold line-clamp-2">{r.video.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{r.reason}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[9px]">
                  {FOUNDATION_LABELS.domain[r.video.foundation_meta.domain]}
                </Badge>
                <Badge variant="outline" className="text-[9px]">
                  {FOUNDATION_LABELS.scope[r.video.foundation_meta.scope]}
                </Badge>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
