import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeVideoConfidence, type ConfidenceResult } from '@/lib/videoConfidence';
import type { TagLayer } from '@/lib/videoRecommendationEngine';

interface VideoRow {
  id: string;
  video_format: string | null;
  skill_domains: string[] | null;
  ai_description: string | null;
}

interface AssignmentRow {
  video_id: string;
  tag_id: string;
  video_tag_taxonomy: { layer: TagLayer } | null;
}

/**
 * Returns a Map<video_id, ConfidenceResult> covering every video the
 * caller can read. Single round trip per query (videos + assignments-with-layer).
 */
export function useVideoConfidenceMap() {
  return useQuery({
    queryKey: ['video-confidence-map'],
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, ConfidenceResult>> => {
      const [videosRes, assignsRes] = await Promise.all([
        supabase
          .from('library_videos')
          .select('id, video_format, skill_domains, ai_description'),
        (supabase as any)
          .from('video_tag_assignments')
          .select('video_id, tag_id, video_tag_taxonomy(layer)'),
      ]);
      if (videosRes.error) throw videosRes.error;
      if (assignsRes.error) throw assignsRes.error;

      const videos = (videosRes.data ?? []) as VideoRow[];
      const assigns = (assignsRes.data ?? []) as AssignmentRow[];

      // Group assignments by video_id
      const byVideo = new Map<string, TagLayer[]>();
      const countByVideo = new Map<string, number>();
      for (const a of assigns) {
        const layer = a.video_tag_taxonomy?.layer;
        if (layer) {
          const arr = byVideo.get(a.video_id) ?? [];
          arr.push(layer);
          byVideo.set(a.video_id, arr);
        }
        countByVideo.set(a.video_id, (countByVideo.get(a.video_id) ?? 0) + 1);
      }

      const out = new Map<string, ConfidenceResult>();
      for (const v of videos) {
        out.set(
          v.id,
          computeVideoConfidence({
            videoFormat: v.video_format,
            skillDomains: v.skill_domains,
            aiDescription: v.ai_description,
            layersCovered: byVideo.get(v.id) ?? [],
            assignmentCount: countByVideo.get(v.id) ?? 0,
          }),
        );
      }
      return out;
    },
  });
}
