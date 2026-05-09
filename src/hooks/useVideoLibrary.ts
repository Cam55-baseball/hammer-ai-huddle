import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LibraryVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: string;
  thumbnail_url: string | null;
  tags: string[];
  sport: string[];
  category: string | null;
  likes_count: number;
  views_count: number;
  created_at: string;
  is_liked?: boolean;
  // Engine-critical structured fields
  video_format?: string | null;
  skill_domains?: string[] | null;
  ai_description?: string | null;
}

export interface LibraryTag {
  id: string;
  name: string;
  category: string | null;
  parent_category: string | null;
}

interface UseVideoLibraryOptions {
  search?: string;
  sportFilter?: string[];
  categoryFilter?: string;
  tagFilters?: string[];
  sort?: 'newest' | 'most_liked';
  savedOnly?: boolean;
  limit?: number;
  /**
   * Owner-only: include videos with `distribution_tier === 'blocked'`.
   * Defaults to false so athlete-facing surfaces never see Empty videos.
   * The owner Video Library Manager passes true so the owner can see and fix them.
   */
  includeBlocked?: boolean;
}

export function useVideoLibrary(options: UseVideoLibraryOptions = {}) {
  const { search, sportFilter, categoryFilter, tagFilters, sort = 'newest', savedOnly = false, limit = 20, includeBlocked = false } = options;
  const { user } = useAuth();
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [tags, setTags] = useState<LibraryTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchVideos = useCallback(async (pageNum = 0, append = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const from = pageNum * limit;
      const to = from + limit - 1;

      let query: any = (supabase as any)
        .from('library_videos')
        .select('*')
        .range(from, to);

      // Phase 6 — athletes never see blocked (Empty) videos.
      // Owner manager opts in via includeBlocked so it can see/fix them.
      if (!includeBlocked) {
        query = query.neq('distribution_tier', 'blocked');
      }

      // Foundation videos live exclusively in the dedicated shelf / route.
      // The owner manager (includeBlocked=true) keeps full visibility.
      if (!includeBlocked) {
        query = query.or('video_class.is.null,video_class.eq.application');
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`title.ilike.${term},description.ilike.${term}`);
      }

      if (sportFilter && sportFilter.length > 0) {
        query = query.overlaps('sport', sportFilter);
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      if (tagFilters && tagFilters.length > 0) {
        query = query.overlaps('tags', tagFilters);
      }

      if (sort === 'most_liked') {
        query = query.order('likes_count', { ascending: false });
      } else {
        // Phase 6 — deterministic ordering: tier first (authoritative),
        // confidence as tie-breaker, recency as final tie-breaker.
        query = query
          .order('tier_rank', { ascending: false })
          .order('confidence_score', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user's likes
      const { data: likes } = await supabase
        .from('library_video_likes')
        .select('video_id')
        .eq('user_id', user.id);

      const likedIds = new Set(likes?.map(l => l.video_id) || []);
      
      let enriched = (data || []).map(v => ({
        ...v,
        tags: v.tags || [],
        sport: v.sport || [],
        is_liked: likedIds.has(v.id),
      })) as LibraryVideo[];

      if (savedOnly) {
        enriched = enriched.filter(v => v.is_liked);
      }

      setHasMore((data?.length || 0) >= limit);
      if (append) {
        setVideos(prev => [...prev, ...enriched]);
      } else {
        setVideos(enriched);
      }
    } catch (err) {
      console.error('Error fetching library videos:', err);
    } finally {
      setLoading(false);
    }
  }, [user, search, sportFilter, categoryFilter, tagFilters, sort, savedOnly, limit, includeBlocked]);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase
      .from('library_tags')
      .select('*')
      .order('name');
    setTags((data || []) as LibraryTag[]);
  }, []);

  useEffect(() => {
    setPage(0);
    fetchVideos(0, false);
  }, [fetchVideos]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchVideos(next, true);
  };

  const toggleLike = async (videoId: string) => {
    if (!user) return;
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    if (video.is_liked) {
      await supabase
        .from('library_video_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);
    } else {
      await supabase
        .from('library_video_likes')
        .insert({ user_id: user.id, video_id: videoId });
    }

    setVideos(prev => prev.map(v =>
      v.id === videoId
        ? { ...v, is_liked: !v.is_liked, likes_count: v.is_liked ? v.likes_count - 1 : v.likes_count + 1 }
        : v
    ));
  };

  const trackView = async (videoId: string) => {
    if (!user) return;
    await supabase.from('library_video_analytics').insert({
      video_id: videoId,
      user_id: user.id,
      action: 'view',
    });
  };

  const trackSearch = async (term: string) => {
    if (!user || !term.trim()) return;
    await supabase.from('library_video_analytics').insert({
      video_id: videos[0]?.id || '00000000-0000-0000-0000-000000000000',
      user_id: user.id,
      action: 'search',
      search_term: term,
    });
  };

  return {
    videos,
    tags,
    loading,
    hasMore,
    loadMore,
    toggleLike,
    trackView,
    trackSearch,
    refetch: () => fetchVideos(0, false),
  };
}
