import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  recommendVideos,
  type SuggestionMode,
  type SkillDomain,
  type VideoWithTags,
  type RecommendResult,
} from '@/lib/videoRecommendationEngine';
import { normalizeTier } from '@/lib/videoTier';
import { useVideoTaxonomy, useVideoTagRules } from './useVideoTaxonomy';

interface UseSuggestionsParams {
  skillDomain: SkillDomain;
  mode: SuggestionMode;
  movementPatterns: string[];
  resultTags: string[];
  contextTags: string[];
  enabled?: boolean;
}

export function useVideoSuggestions(params: UseSuggestionsParams) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: taxonomy = [] } = useVideoTaxonomy(params.skillDomain);
  const { data: rules = [] } = useVideoTagRules(params.skillDomain);

  // Cross-tab invalidation on rep/session save
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('data-sync');
    const onMsg = (ev: MessageEvent) => {
      if (['rep_logged', 'session_saved', 'analysis_complete'].includes(ev.data?.type)) {
        qc.invalidateQueries({ queryKey: ['video-suggestions'] });
      }
    };
    ch.addEventListener('message', onMsg);
    return () => { ch.removeEventListener('message', onMsg); ch.close(); };
  }, [qc]);

  return useQuery({
    queryKey: ['video-suggestions', params.skillDomain, params.mode, params.movementPatterns, params.resultTags, params.contextTags, user?.id],
    enabled: (params.enabled ?? true) && taxonomy.length > 0 && (params.movementPatterns.length + params.resultTags.length > 0),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<RecommendResult[]> => {
      // Fetch candidate videos with their assignments
      const { data: videos, error: vErr } = await supabase
        .from('library_videos')
        .select('id, title, description, thumbnail_url, video_url, created_at')
        .limit(500);
      if (vErr) throw vErr;

      const ids = (videos || []).map(v => v.id);
      if (!ids.length) return [];

      // Extra columns + assignments fetched separately to avoid TS strictness on new cols
      const [{ data: meta }, { data: assignments }, { data: metrics }, { data: outcomes }] = await Promise.all([
        (supabase as any).from('library_videos').select('id, video_format, skill_domains, ai_description, confidence_score, distribution_tier').in('id', ids),
        (supabase as any).from('video_tag_assignments').select('video_id, tag_id, weight').in('video_id', ids),
        (supabase as any).from('video_performance_metrics').select('video_id, post_view_improvement_sum, post_view_improvement_n').in('video_id', ids),
        user ? (supabase as any).from('video_user_outcomes').select('video_id, post_score_delta').eq('user_id', user.id).in('video_id', ids) : Promise.resolve({ data: [] }),
      ]);

      const metaMap = new Map<string, any>();
      (meta || []).forEach((m: any) => metaMap.set(m.id, m));

      const assignMap = new Map<string, { tag_id: string; weight: number }[]>();
      (assignments || []).forEach((a: any) => {
        const arr = assignMap.get(a.video_id) || [];
        arr.push({ tag_id: a.tag_id, weight: a.weight });
        assignMap.set(a.video_id, arr);
      });

      const candidates: VideoWithTags[] = (videos || []).map(v => {
        const m = metaMap.get(v.id) || {};
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          created_at: v.created_at,
          video_format: m.video_format,
          skill_domains: m.skill_domains,
          ai_description: m.ai_description,
          confidence_score: m.confidence_score,
          distribution_tier: normalizeTier(m.distribution_tier),
          assignments: assignMap.get(v.id) || [],
        };
      });

      const globalMetrics = new Map<string, { improvementScore: number }>();
      (metrics || []).forEach((m: any) => {
        const score = m.post_view_improvement_n > 0 ? m.post_view_improvement_sum / m.post_view_improvement_n : 0;
        globalMetrics.set(m.video_id, { improvementScore: score });
      });

      const userOutcomes = new Map<string, { watchCount: number; avgPostDelta: number }>();
      (outcomes || []).forEach((o: any) => {
        const cur = userOutcomes.get(o.video_id) || { watchCount: 0, avgPostDelta: 0 };
        const n = cur.watchCount + 1;
        const avg = (cur.avgPostDelta * cur.watchCount + (o.post_score_delta || 0)) / n;
        userOutcomes.set(o.video_id, { watchCount: n, avgPostDelta: avg });
      });

      return recommendVideos({
        skillDomain: params.skillDomain,
        mode: params.mode,
        movementPatterns: params.movementPatterns,
        resultTags: params.resultTags,
        contextTags: params.contextTags,
        candidateVideos: candidates,
        taxonomy,
        rules,
        userOutcomes,
        globalMetrics,
      });
    },
  });
}

export async function trackVideoSuggestionShown(
  userId: string,
  videoId: string,
  mode: SuggestionMode,
  skillDomain: SkillDomain,
  reasons: string[]
) {
  await (supabase as any).from('video_user_outcomes').insert({
    user_id: userId,
    video_id: videoId,
    mode,
    skill_domain: skillDomain,
    suggestion_reason: { reasons },
  });
}

export async function trackVideoWatched(userId: string, videoId: string, watchSeconds: number) {
  await (supabase as any)
    .from('video_user_outcomes')
    .update({ watched_at: new Date().toISOString(), watch_seconds: watchSeconds })
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .is('watched_at', null);
}
