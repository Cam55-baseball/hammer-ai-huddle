/**
 * Library videos matched to what THIS analysis actually found.
 *
 * Matching is taxonomy-key based (correction layer first), never prose.
 * There is no fallback tier here on purpose: if nothing in the library matches
 * the athlete's feedback, we say so. A popular or recent video is not an answer
 * to a fault it was never tagged for.
 */
import { useEffect, useMemo } from 'react';
import { Bookmark, Heart, Play, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useVideoSuggestions, trackVideoSuggestionShown, trackVideoWatched } from '@/hooks/useVideoSuggestions';
import { analysisFeedbackToTaxonomy, type AnalysisLike } from '@/lib/analysisFeedbackToTaxonomy';
import { useVideoFaultFeedback } from '@/hooks/useVideoFaultFeedback';
import { cn } from '@/lib/utils';
import { moduleToSkillDomain } from '@/lib/videoMoments/registry';
import type { SkillDomain, TagSport } from '@/lib/videoRecommendationEngine';

interface Props {
  analysis: AnalysisLike | null | undefined;
  module: string | null | undefined;
  sport?: string | null;
}

const SUPPORTED: SkillDomain[] = ['hitting', 'pitching', 'throwing'];

export function AnalysisVideoRecommendations({ analysis, module, sport }: Props) {
  const { user } = useAuth();
  const skillDomain = moduleToSkillDomain(module || '');
  const tagSport: TagSport = sport === 'softball' ? 'softball' : 'baseball';

  const signals = useMemo(
    () =>
      skillDomain && SUPPORTED.includes(skillDomain)
        ? analysisFeedbackToTaxonomy(analysis, skillDomain, tagSport)
        : null,
    [analysis, skillDomain, tagSport],
  );

  const { data: suggestions = [], isLoading } = useVideoSuggestions({
    skillDomain: skillDomain ?? 'hitting',
    mode: 'session',
    movementPatterns: signals?.movementPatterns ?? [],
    resultTags: [],
    contextTags: [],
    correctionTags: signals?.correctionTags ?? [],
    feedbackEvidence: signals?.evidence,
    sport: tagSport,
    enabled: Boolean(signals),
  });

  const feedback = useVideoFaultFeedback(suggestions.map(s => s.video.id));
  const primaryFault = signals?.correctionTags[0] ?? signals?.movementPatterns[0] ?? null;
  const faultLayer: 'correction' | 'movement_pattern' | null =
    signals?.correctionTags.length ? 'correction' : signals?.movementPatterns.length ? 'movement_pattern' : null;

  useEffect(() => {
    if (!user || !skillDomain || !suggestions.length) return;
    suggestions.forEach(s => {
      trackVideoSuggestionShown(user.id, s.video.id, 'session', skillDomain, s.reasons).catch(() => {});
    });
  }, [user, suggestions, skillDomain]);

  if (!signals) return null;

  const hasFeedbackKeys = signals.movementPatterns.length + signals.correctionTags.length > 0;

  return (
    <Card className="p-4 space-y-3 border-primary/20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Watch this next</h3>
      </div>

      {!hasFeedbackKeys ? (
        <p className="text-sm text-muted-foreground">
          This analysis didn't flag a fault we can match a video to.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Matching your feedback to the library…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No video in the library covers what this analysis found yet. We won't show you an
          unrelated clip to fill the space — this will appear as soon as one is added.
        </p>
      ) : (
        <div className="space-y-2">
          {suggestions.map(({ video, reasons }) => (
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
                  {reasons.slice(0, 2).map((r, i) => (
                    <li key={i} className="line-clamp-2">• {r}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1 self-center shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    if (user) trackVideoWatched(user.id, video.id, 0).catch(() => {});
                    window.open(video.video_url, '_blank');
                  }}
                >
                  <Play className="h-3 w-3 mr-1" /> Watch
                </Button>
                {feedback.canRecord && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      aria-label="This helped"
                      onClick={() =>
                        feedback.toggleLike(video.id, {
                          skillDomain: skillDomain ?? 'hitting',
                          faultTagKey: primaryFault,
                          faultTagLayer: faultLayer,
                          source: 'analysis_recommendation',
                        })
                      }
                    >
                      <Heart className={cn('h-3.5 w-3.5', feedback.isLiked(video.id) && 'fill-destructive text-destructive')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      aria-label="Save for later"
                      onClick={() =>
                        feedback.toggleSave(video.id, {
                          skillDomain: skillDomain ?? 'hitting',
                          faultTagKey: primaryFault,
                          faultTagLayer: faultLayer,
                          source: 'analysis_recommendation',
                        })
                      }
                    >
                      <Bookmark className={cn('h-3.5 w-3.5', feedback.isSaved(video.id) && 'fill-primary text-primary')} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            Matched to the faults this analysis reported — nothing else.
          </p>
        </div>
      )}
    </Card>
  );
}
