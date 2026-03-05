import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VaultVideo {
  id: string;
  storage_path: string;
  filename: string;
  session_id: string;
  tagged_rep_indexes: number[];
  module?: string;
  session_type?: string;
  session_date?: string;
  created_at: string;
}

interface VaultVideoFilters {
  module?: string;
  dateFrom?: string;
  dateTo?: string;
  sessionId?: string;
}

export function useVaultVideos(filters?: VaultVideoFilters) {
  const { user } = useAuth();

  const { data: videos = [], isLoading, refetch } = useQuery({
    queryKey: ['vault-videos', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      // Query session_videos joined with performance_sessions
      let query = supabase
        .from('session_videos' as any)
        .select('*, performance_sessions!inner(module, session_type, session_date)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }
      if (filters?.module) {
        query = query.eq('performance_sessions.module', filters.module);
      }
      if (filters?.dateFrom) {
        query = query.gte('performance_sessions.session_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('performance_sessions.session_date', filters.dateTo);
      }

      const { data, error } = await query.limit(100);
      if (error) {
        console.error('Error fetching vault videos:', error);
        return [];
      }

      return (data || []).map((v: any) => ({
        id: v.id,
        storage_path: v.storage_path,
        filename: v.filename,
        session_id: v.session_id,
        tagged_rep_indexes: v.tagged_rep_indexes || [],
        module: v.performance_sessions?.module,
        session_type: v.performance_sessions?.session_type,
        session_date: v.performance_sessions?.session_date,
        created_at: v.created_at,
      })) as VaultVideo[];
    },
    enabled: !!user,
  });

  const getVideoUrl = useCallback(async (storagePath: string) => {
    const { data } = await supabase.storage.from('videos').createSignedUrl(storagePath, 3600);
    return data?.signedUrl || null;
  }, []);

  return { videos, isLoading, refetch, getVideoUrl };
}
