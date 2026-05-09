import { useNavigate } from 'react-router-dom';
import { BookOpen, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFoundationVideos } from '@/hooks/useFoundationVideos';
import { FOUNDATION_LABELS } from '@/lib/foundationVideos';

export function FoundationsShelf() {
  const navigate = useNavigate();
  const { results, activeTriggers, loading } = useFoundationVideos({ limit: 4 });

  if (loading || results.length === 0) return null;

  return (
    <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Foundations — refresh your base
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {activeTriggers.length > 0
              ? 'Surfaced because of where you are this week.'
              : 'Long-form philosophy and mechanics primers.'}
          </p>
        </div>
        {activeTriggers.length > 0 && (
          <div className="flex flex-wrap gap-1">
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
            onClick={() => navigate(`/video-library/${r.video.id}`)}
            className="group text-left rounded-md border bg-card hover:border-primary/50 transition-colors overflow-hidden"
          >
            <div className="aspect-video bg-muted relative">
              {r.video.thumbnail_url ? (
                <img src={r.video.thumbnail_url} alt={r.video.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                <Play className="h-8 w-8 text-white" />
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
