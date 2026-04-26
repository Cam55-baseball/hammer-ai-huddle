import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { validateVideoFile, VIDEO_LIMITS } from '@/data/videoLimits';

interface UploadVideoPayload {
  title: string;
  description?: string;
  notes?: string;
  tags: string[];
  sport: string[];
  category?: string;
  videoFile?: File;
  externalUrl?: string;
  videoType: 'upload' | 'youtube' | 'vimeo' | 'external';
  thumbnailUrl?: string;
  // Hammer 6-Layer structured tagging (V1)
  videoFormat?: string;
  skillDomains?: string[];
  aiDescription?: string;
  tagAssignments?: Record<string, number>; // taxonomy tag id -> weight
}

export function useVideoLibraryAdmin() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadVideo = useCallback(async (payload: UploadVideoPayload) => {
    if (!user) return null;

    // Project rule: no blank video_url ever
    if (payload.videoType !== 'upload' && (!payload.externalUrl || !payload.externalUrl.trim())) {
      toast({ title: 'Video URL required', description: 'Paste a valid video link.', variant: 'destructive' });
      return null;
    }

    setUploading(true);
    try {
      let videoUrl = payload.externalUrl?.trim() || '';

      if (payload.videoType === 'upload' && payload.videoFile) {
        const validation = validateVideoFile(payload.videoFile);
        if (!validation.valid) {
          toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
          return null;
        }

        const ext = payload.videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const id = crypto.randomUUID();
        const path = `${user.id}/library/${id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(path, payload.videoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('videos').getPublicUrl(path);
        videoUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('library_videos')
        .insert({
          owner_id: user.id,
          title: payload.title,
          description: payload.description || null,
          notes: payload.notes || null,
          video_url: videoUrl,
          video_type: payload.videoType,
          thumbnail_url: payload.thumbnailUrl || null,
          tags: payload.tags,
          sport: payload.sport,
          category: payload.category || null,
          // Hammer V1 structured fields
          video_format: payload.videoFormat || null,
          skill_domains: payload.skillDomains || [],
          ai_description: payload.aiDescription || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Insert structured tag assignments
      if (data && payload.tagAssignments && Object.keys(payload.tagAssignments).length > 0) {
        const rows = Object.entries(payload.tagAssignments).map(([tag_id, weight]) => ({
          video_id: data.id, tag_id, weight,
        }));
        const { error: aErr } = await (supabase as any).from('video_tag_assignments').insert(rows);
        if (aErr) {
          console.error('Tag assignment insert error:', aErr);
          toast({
            title: 'Tags not saved',
            description: 'Video was added but the tag assignments failed. Open Edit to fix.',
            variant: 'destructive',
          });
        }
      }

      // Auto-trigger AI analysis if ai_description set and structured tags sparse
      const sparseTags = !payload.tagAssignments || Object.keys(payload.tagAssignments).length < 2;
      if (data && payload.aiDescription && sparseTags) {
        supabase.functions.invoke('analyze-video-description', { body: { videoId: data.id } })
          .then((res: any) => {
            const inserted = res?.data?.inserted ?? 0;
            if (inserted > 0) {
              toast({ title: 'AI suggestions ready', description: `${inserted} tags proposed — review in AI Suggestions tab.` });
            }
          })
          .catch(err => console.error('AI auto-tag failed:', err));
      }

      toast({ title: 'Video added', description: 'Video has been added to the library.' });
      return data;
    } catch (err: any) {
      console.error('Error uploading video:', err);
      toast({ title: 'Error', description: err.message || 'Failed to add video', variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user]);

  const updateVideo = useCallback(async (videoId: string, updates: Partial<UploadVideoPayload>) => {
    const updateData: Record<string, any> = {
      ...(updates.title && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.tags && { tags: updates.tags }),
      ...(updates.sport && { sport: updates.sport }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.thumbnailUrl !== undefined && { thumbnail_url: updates.thumbnailUrl }),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('library_videos')
      .update(updateData as any)
      .eq('id', videoId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Updated', description: 'Video updated successfully.' });
    return true;
  }, []);

  const replaceVideoFile = useCallback(async (videoId: string, file: File) => {
    if (!user) return null;
    setUploading(true);
    try {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
        return null;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const ts = Date.now();
      const path = `${user.id}/library/${videoId}_v${ts}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(path);
      const newUrl = urlData.publicUrl;

      const { data, error } = await supabase.rpc('replace_video_version', {
        p_video_id: videoId,
        p_new_url: newUrl,
        p_video_type: 'upload',
        p_file_size: file.size,
      } as any);

      if (error) throw error;

      toast({ title: 'Video replaced', description: 'New version is now active.' });
      return data;
    } catch (err: any) {
      console.error('Error replacing video:', err);
      toast({ title: 'Error', description: err.message || 'Failed to replace video', variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user]);

  const deleteVideo = useCallback(async (videoId: string) => {
    const { error } = await supabase
      .from('library_videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Deleted', description: 'Video removed from library.' });
    return true;
  }, []);

  const addTag = useCallback(async (name: string, category?: string, parentCategory?: string) => {
    const { error } = await supabase
      .from('library_tags')
      .insert({ name, category: category || null, parent_category: parentCategory || null });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, []);

  const deleteTag = useCallback(async (tagId: string) => {
    const { error } = await supabase
      .from('library_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, []);

  const fetchAnalytics = useCallback(async () => {
    const [viewsRes, searchesRes, videosRes] = await Promise.all([
      supabase
        .from('library_video_analytics')
        .select('video_id, action')
        .eq('action', 'view'),
      supabase
        .from('library_video_analytics')
        .select('search_term')
        .eq('action', 'search')
        .not('search_term', 'is', null),
      supabase
        .from('library_videos')
        .select('id, title, likes_count, views_count')
        .order('likes_count', { ascending: false })
        .limit(20),
    ]);

    // Count views per video
    const viewCounts: Record<string, number> = {};
    viewsRes.data?.forEach(v => {
      viewCounts[v.video_id] = (viewCounts[v.video_id] || 0) + 1;
    });

    // Count search terms
    const searchCounts: Record<string, number> = {};
    searchesRes.data?.forEach(s => {
      if (s.search_term) {
        const term = s.search_term.toLowerCase();
        searchCounts[term] = (searchCounts[term] || 0) + 1;
      }
    });

    const topSearches = Object.entries(searchCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([term, count]) => ({ term, count }));

    return {
      mostLiked: videosRes.data || [],
      topSearches,
      totalViews: viewsRes.data?.length || 0,
    };
  }, []);

  return {
    uploadVideo,
    updateVideo,
    replaceVideoFile,
    deleteVideo,
    addTag,
    deleteTag,
    fetchAnalytics,
    uploading,
  };
}
