import { useEffect } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  useVideoSuggestions,
  trackVideoSuggestionShown,
  trackVideoWatched,
} from '@/hooks/useVideoSuggestions';
import type { SuggestionMode, SkillDomain } from '@/lib/videoRecommendationEngine';

interface Props {
  skillDomain: SkillDomain;
  mode: SuggestionMode;
  movementPatterns?: string[];
  resultTags?: string[];
  contextTags?: string[];
  title?: string;
  className?: string;
}

export function VideoSuggestionsPanel({
  skillDomain, mode,
  movementPatterns = [], resultTags = [], contextTags = [],
  title, className,
}: Props) {
  const { user } = useAuth();
  const { data: suggestions = [], isLoading } = useVideoSuggestions({
    skillDomain, mode, movementPatterns, resultTags, contextTags,
  });

  // Track impressions
  useEffect(() => {
    if (!user || !suggestions.length) return;
    suggestions.forEach(s => {
      trackVideoSuggestionShown(user.id, s.video.id, mode, skillDomain, s.reasons).catch(() => {});
    });
  }, [user, suggestions, mode, skillDomain]);

  if (isLoading || !suggestions.length) return null;

  const heading = title || (mode === 'session'
    ? 'Session insights — watch these'
    : 'Long-term development picks');

  return (
    <Card className={`p-4 space-y-3 border-primary/20 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{heading}</h3>
        <Badge variant="outline" className="text-[10px] ml-auto capitalize">{mode.replace('_', ' ')}</Badge>
      </div>

      <div className="space-y-2">
        {suggestions.map(({ video, reasons, score }) => (
          <div key={video.id} className="flex gap-3 p-2 rounded-md border bg-card hover:bg-accent/30 transition">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt="" className="h-16 w-24 rounded object-cover shrink-0" />
            ) : (
              <div className="h-16 w-24 rounded bg-muted shrink-0 flex items-center justify-center">
                <Play className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{video.title}</p>
              <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                {reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="line-clamp-1">• {r}</li>
                ))}
              </ul>
            </div>
            <Button
              size="sm"
              variant="default"
              className="self-center shrink-0"
              onClick={() => {
                if (user) trackVideoWatched(user.id, video.id, 0).catch(() => {});
                window.open(video.video_url, '_blank');
              }}
            >
              <Play className="h-3 w-3 mr-1" /> Watch
            </Button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Why these? {mode === 'session' ? 'Based on patterns across this session.' : 'Based on your long-term weakness profile.'}
      </p>
    </Card>
  );
}
