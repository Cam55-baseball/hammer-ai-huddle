/**
 * Library videos matched to what THIS analysis actually found.
 *
 * Matching is taxonomy-key based (correction layer first), never prose.
 * There is no fallback tier here on purpose: if nothing in the library matches
 * the athlete's feedback, we say so. A popular or recent video is not an answer
 * to a fault it was never tagged for.
 */
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Heart, Play, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useVideoSuggestions, trackVideoSuggestionShown, trackVideoWatched } from '@/hooks/useVideoSuggestions';
import { useCrossDomainFaults } from '@/hooks/useCrossDomainFaults';
import { useRecentFaultKeys } from '@/hooks/useRecentFaultKeys';
import { useSeasonStatus } from '@/hooks/useSeasonStatus';
import { seasonContextTags, phaseLabel, type RelevancePhase } from '@/lib/videoRelevanceContext';
import { crossDomainCorrectionKeys } from '@/lib/analysis/crossDomainFaults';
import { analysisFeedbackToTaxonomy, type AnalysisLike } from '@/lib/analysisFeedbackToTaxonomy';
import { useVideoFaultFeedback } from '@/hooks/useVideoFaultFeedback';
import { cn } from '@/lib/utils';
import { moduleToSkillDomain } from '@/lib/videoMoments/registry';
import { VideoThumb } from '@/components/video/VideoThumb';
import { VideoLightbox, type LightboxVideo } from '@/components/video/VideoLightbox';
import type { SkillDomain, TagSport } from '@/lib/videoRecommendationEngine';

interface Props {
  analysis: AnalysisLike | null | undefined;
  module: string | null | undefined;
  sport?: string | null;
  /**
   * Set when this run failed to save its coaching findings. A failed write is
   * never swallowed — the athlete is told the history is incomplete.
   */
  persistenceError?: string | null;
}


// Every domain the analyser can report on. Fielding and base running have no
// analyser faults yet, but the surface no longer refuses them by name.
const SUPPORTED: SkillDomain[] = ['hitting', 'pitching', 'throwing', 'fielding', 'base_running'];

export function AnalysisVideoRecommendations({ analysis, module, sport, persistenceError }: Props) {
  const { user } = useAuth();
  const skillDomain = moduleToSkillDomain(module || '');
  const tagSport: TagSport = sport === 'softball' ? 'softball' : 'baseball';
  const [playing, setPlaying] = useState<LightboxVideo | null>(null);

  const signals = useMemo(
    () =>
      skillDomain && SUPPORTED.includes(skillDomain)
        ? analysisFeedbackToTaxonomy(analysis, skillDomain, tagSport)
        : null,
    [analysis, skillDomain, tagSport],
  );

  // Cross-skill root patterns rank above single-discipline faults.
  const { data: rootGroups = [] } = useCrossDomainFaults();
  const rootKeys = useMemo(() => crossDomainCorrectionKeys(rootGroups), [rootGroups]);

  // What the plan is already working on in this domain.
  const { data: openFaultKeys = [] } = useRecentFaultKeys(skillDomain);

  // Where the athlete is in their year — decides which situations are relevant.
  const { resolvedPhase } = useSeasonStatus();
  const contextTags = useMemo(
    () => seasonContextTags(skillDomain, resolvedPhase as RelevancePhase, tagSport),
    [skillDomain, resolvedPhase, tagSport],
  );

  const correctionTags = useMemo(
    () => Array.from(new Set([...(signals?.correctionTags ?? []), ...openFaultKeys])),
    [signals?.correctionTags, openFaultKeys],
  );

  const { data: suggestions = [], isLoading } = useVideoSuggestions({
    skillDomain: skillDomain ?? 'hitting',
    mode: 'session',
    movementPatterns: signals?.movementPatterns ?? [],
    resultTags: signals?.resultTags ?? [],
    contextTags,
    correctionTags,
    feedbackEvidence: signals?.evidence,
    sport: tagSport,
    rootPatternCorrectionKeys: rootKeys,
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

  const hasFeedbackKeys =
    signals.movementPatterns.length + signals.correctionTags.length + contextTags.length > 0;
  const phase = phaseLabel(resolvedPhase as RelevancePhase);

  return (
    <Card className="p-4 space-y-3 border-primary/20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Watch this next</h3>
      </div>

      {persistenceError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          We couldn't save what this analysis found, so it won't count toward your history or
          cross-skill patterns. The picks below still come from this run. ({persistenceError})
        </p>
      )}



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
          {suggestions.map(({ video, reasons, relevance }) => (
            <div key={video.id} className="flex gap-3 p-2 rounded-md border bg-card hover:bg-accent/30 transition">
              <VideoThumb
                videoUrl={video.video_url}
                thumbnailUrl={video.thumbnail_url}
                title={video.title}
                className="h-16 w-24"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium truncate">{video.title}</p>
                  {relevance === 'general' && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                      General
                    </Badge>
                  )}
                </div>
                {relevance === 'general' && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    General work for {phase ? `where you are ${phase}` : 'your situation'} — not a fix for a fault
                    in this clip.
                  </p>
                )}
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
                    // Plays in an overlay. Nothing leaves the app, so closing
                    // returns to this analysis, same scroll, still signed in.
                    setPlaying({
                      id: video.id,
                      title: video.title,
                      video_url: video.video_url,
                      thumbnail_url: video.thumbnail_url,
                    });
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
            Matched to the faults this analysis reported, what your plan is already working on,
            and {phase ? `where you are ${phase}` : 'your season'} — nothing else.
          </p>
        </div>
      )}

      <VideoLightbox video={playing} onOpenChange={(open) => !open && setPlaying(null)} />
    </Card>
  );
}
