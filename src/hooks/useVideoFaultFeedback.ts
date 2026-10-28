/**
 * Liking / saving a recommended video, recorded against the fault it was
 * recommended for.
 *
 * The fault key is the whole point: a like only means something if we know
 * WHICH problem the athlete thought the video helped with. Nothing here
 * invents an improvement signal — whether the athlete actually got better on
 * that fault is measured separately, from later analyses.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FaultContext {
  skillDomain: string;
  faultTagKey: string | null;
  faultTagLayer: 'correction' | 'movement_pattern' | null;
  source: 'analysis_recommendation' | 'library';
}

export function useVideoFaultFeedback(videoIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLiked(new Set());
    setSaved(new Set());
    if (!user || videoIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const [{ data: likes }, { data: saves }] = await Promise.all([
        (supabase as any).from('library_video_likes').select('video_id').eq('user_id', user.id).in('video_id', videoIds),
        (supabase as any).from('library_video_saves').select('video_id').eq('user_id', user.id).in('video_id', videoIds),
      ]);
      if (cancelled) return;
      setLiked(new Set((likes || []).map((r: any) => r.video_id)));
      setSaved(new Set((saves || []).map((r: any) => r.video_id)));
    })();
    return () => { cancelled = true; };
  }, [userId, videoIds.join(',')]);

  const toggle = useCallback(
    async (table: 'library_video_likes' | 'library_video_saves', videoId: string, ctx: FaultContext) => {
      if (!user) return;
      const set = table === 'library_video_likes' ? liked : saved;
      const apply = table === 'library_video_likes' ? setLiked : setSaved;
      try {
        const result = set.has(videoId)
          ? await (supabase as any).from(table).delete().eq('user_id', user.id).eq('video_id', videoId)
          : await (supabase as any).from(table).insert({
          user_id: user.id,
          video_id: videoId,
          skill_domain: ctx.skillDomain,
          fault_tag_key: ctx.faultTagKey,
          fault_tag_layer: ctx.faultTagLayer,
          source: ctx.source,
          });
        if (result.error) throw result.error;
        if (currentUserId.current !== user.id) return false;
        const next = new Set(set);
        if (set.has(videoId)) next.delete(videoId);
        else next.add(videoId);
        apply(next);
        return true;
      } catch {
        toast.error("Couldn't save your video choice. Try again.");
        return false;
      }
    },
    [user, liked, saved],
  );

  return {
    isLiked: (id: string) => liked.has(id),
    isSaved: (id: string) => saved.has(id),
    toggleLike: (id: string, ctx: FaultContext) => toggle('library_video_likes', id, ctx),
    toggleSave: (id: string, ctx: FaultContext) => toggle('library_video_saves', id, ctx),
    canRecord: Boolean(user),
  };
}
