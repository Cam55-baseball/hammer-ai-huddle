import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface RoyalTimingSession {
  id: string;
  user_id: string;
  subject_reason: string | null;
  findings: string | null;
  ai_analysis: any;
  timer_data: any;
  video_urls: string[] | null;
  video_1_path: string | null;
  video_2_path: string | null;
  sport: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SharedSession {
  id: string;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  created_at: string | null;
  session?: RoyalTimingSession;
  sender_profile?: { full_name: string | null };
}

export function useRoyalTimingSessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['royal-timing-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('royal_timing_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RoyalTimingSession[];
    },
    enabled: !!user,
  });

  const sharedWithMeQuery = useQuery({
    queryKey: ['royal-timing-shared-with-me', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('royal_timing_shares')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch session data and sender profiles for each share
      const enriched: SharedSession[] = [];
      for (const share of data) {
        const [sessionRes, profileRes] = await Promise.all([
          supabase.from('royal_timing_sessions').select('*').eq('id', share.session_id).single(),
          supabase.from('profiles').select('full_name').eq('id', share.sender_id).single(),
        ]);
        enriched.push({
          ...share,
          session: sessionRes.data as RoyalTimingSession | undefined,
          sender_profile: profileRes.data ?? undefined,
        });
      }
      return enriched;
    },
    enabled: !!user,
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('royal_timing_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royal-timing-sessions'] });
      toast({ title: 'Session deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete session', variant: 'destructive' });
    },
  });

  const duplicateSession = useMutation({
    mutationFn: async (session: RoyalTimingSession) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('royal_timing_sessions').insert({
        user_id: user.id,
        subject_reason: session.subject_reason ? `${session.subject_reason} (copy)` : null,
        findings: session.findings,
        ai_analysis: session.ai_analysis,
        timer_data: session.timer_data,
        video_urls: session.video_urls,
        video_1_path: session.video_1_path,
        video_2_path: session.video_2_path,
        sport: session.sport,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['royal-timing-sessions'] });
      toast({ title: 'Session duplicated' });
    },
    onError: () => {
      toast({ title: 'Failed to duplicate session', variant: 'destructive' });
    },
  });

  const getVideoUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    const { data } = supabase.storage.from('videos').getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  return {
    sessions: sessionsQuery.data ?? [],
    sessionsLoading: sessionsQuery.isLoading,
    sharedSessions: sharedWithMeQuery.data ?? [],
    sharedLoading: sharedWithMeQuery.isLoading,
    deleteSession,
    duplicateSession,
    getVideoUrl,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['royal-timing-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['royal-timing-shared-with-me'] });
    },
  };
}
