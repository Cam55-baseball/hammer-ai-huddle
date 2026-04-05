import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────

export interface PromoScene {
  id: string;
  title: string;
  feature_area: string;
  duration_variant: string;
  description: string | null;
  scene_key: string;
  thumbnail_url: string | null;
  sim_data: Record<string, any>;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PromoProject {
  id: string;
  title: string;
  target_audience: string;
  video_goal: string;
  target_duration: number;
  scene_sequence: SceneSequenceItem[];
  format: string;
  status: string;
  output_url: string | null;
  render_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SceneSequenceItem {
  scene_id: string;
  scene_key: string;
  title: string;
  duration_variant: string;
  order: number;
  overrides?: Record<string, any>;
}

export interface RenderJob {
  id: string;
  project_id: string;
  format: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  output_url: string | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const AUDIENCE_GOAL_MAP: Record<string, Record<string, string[]>> = {
  player: {
    awareness: ['hook-problem', 'dashboard-hero', 'tex-vision-drill', 'mpi-engine', 'cta-closer'],
    conversion: ['hook-problem', 'dashboard-hero', 'proof-stats', 'mpi-engine', 'cta-closer'],
    feature_highlight: ['dashboard-hero', 'tex-vision-drill', 'game-scoring-live', 'practice-hub-session', 'cta-closer'],
  },
  parent: {
    awareness: ['hook-problem', 'vault-progress', 'dashboard-hero', 'proof-stats', 'cta-closer'],
    conversion: ['hook-problem', 'vault-progress', 'proof-stats', 'mpi-engine', 'cta-closer'],
    feature_highlight: ['dashboard-hero', 'vault-progress', 'mpi-engine', 'video-library-browse', 'cta-closer'],
  },
  coach: {
    awareness: ['hook-problem', 'game-scoring-live', 'practice-hub-session', 'mpi-engine', 'cta-closer'],
    conversion: ['hook-problem', 'game-scoring-live', 'dashboard-hero', 'proof-stats', 'cta-closer'],
    feature_highlight: ['game-scoring-live', 'practice-hub-session', 'mpi-engine', 'video-library-browse', 'cta-closer'],
  },
  scout: {
    awareness: ['hook-problem', 'mpi-engine', 'video-library-browse', 'proof-stats', 'cta-closer'],
    conversion: ['hook-problem', 'mpi-engine', 'dashboard-hero', 'proof-stats', 'cta-closer'],
    feature_highlight: ['mpi-engine', 'video-library-browse', 'dashboard-hero', 'game-scoring-live', 'cta-closer'],
  },
  program: {
    awareness: ['hook-problem', 'dashboard-hero', 'practice-hub-session', 'proof-stats', 'cta-closer'],
    conversion: ['hook-problem', 'practice-hub-session', 'mpi-engine', 'proof-stats', 'cta-closer'],
    feature_highlight: ['practice-hub-session', 'game-scoring-live', 'mpi-engine', 'dashboard-hero', 'cta-closer'],
  },
};

export function getRecommendedScenes(audience: string, goal: string): string[] {
  return AUDIENCE_GOAL_MAP[audience]?.[goal] || AUDIENCE_GOAL_MAP.player.awareness;
}

export function getDurationForVariant(variant: string): number {
  switch (variant) {
    case '3s': return 3;
    case '7s': return 7;
    case '15s': return 15;
    default: return 7;
  }
}

export function pickDurationVariant(targetDuration: number, sceneCount: number): string {
  const avgPerScene = targetDuration / sceneCount;
  if (avgPerScene <= 4) return '3s';
  if (avgPerScene <= 10) return '7s';
  return '15s';
}

export const FORMAT_CONFIGS: Record<string, { label: string; aspect: string; width: number; height: number }> = {
  tiktok: { label: 'TikTok', aspect: '9:16', width: 1080, height: 1920 },
  reels: { label: 'Instagram Reels', aspect: '9:16', width: 1080, height: 1920 },
  shorts: { label: 'YouTube Shorts', aspect: '9:16', width: 1080, height: 1920 },
  youtube: { label: 'YouTube', aspect: '16:9', width: 1920, height: 1080 },
  hero: { label: 'Website Hero', aspect: '16:9', width: 1920, height: 1080 },
};

// ─── Queries ─────────────────────────────────────────────────────────

export function usePromoScenes() {
  return useQuery({
    queryKey: ['promo-scenes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_scenes')
        .select('*')
        .order('feature_area', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PromoScene[];
    },
  });
}

export function usePromoProjects() {
  return useQuery({
    queryKey: ['promo-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PromoProject[];
    },
  });
}

export function useRenderQueue() {
  return useQuery({
    queryKey: ['promo-render-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_render_queue')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RenderJob[];
    },
    refetchInterval: (query) => {
      const jobs = query.state.data as RenderJob[] | undefined;
      const hasActive = jobs?.some(j => j.status === 'queued' || j.status === 'processing');
      return hasActive ? 5000 : false;
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (project: Omit<PromoProject, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('promo_projects')
        .insert(project as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-projects'] });
      toast({ title: 'Project Created', description: 'Video project saved successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSceneStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('promo_scenes')
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-scenes'] });
    },
  });
}

export function useQueueRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, format }: { projectId: string; format: string }) => {
      // Insert queue row — DB trigger automatically invokes render-promo edge function
      const { data, error } = await supabase
        .from('promo_render_queue')
        .insert({ project_id: projectId, format, status: 'queued' } as any)
        .select()
        .single();
      if (error) throw error;

      // Update project status
      await supabase
        .from('promo_projects')
        .update({ status: 'rendering' } as any)
        .eq('id', projectId);

      return { queueRow: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-render-queue'] });
      queryClient.invalidateQueries({ queryKey: ['promo-projects'] });
      toast({ title: 'Render Queued', description: 'Video render job has been validated and queued' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promo_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-projects'] });
      toast({ title: 'Project Deleted' });
    },
  });
}
