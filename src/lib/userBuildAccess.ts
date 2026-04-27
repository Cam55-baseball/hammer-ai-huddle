/**
 * PHASE 13 — Access helper for purchased builds.
 * RLS guarantees the caller can only see their own access rows
 * (or all, if owner). Webhook is the sole writer.
 */
import { supabase } from '@/integrations/supabase/client';

export type UserBuild = {
  build_id: string;
  build_type: 'program' | 'bundle' | 'consultation' | string;
  granted_at: string;
};

export async function hasAccess(userId: string, buildId: string): Promise<boolean> {
  if (!userId || !buildId) return false;
  const { data, error } = await supabase
    .from('user_build_access')
    .select('id')
    .eq('user_id', userId)
    .eq('build_id', buildId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getUserBuilds(userId: string): Promise<UserBuild[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_build_access')
    .select('build_id, build_type, granted_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as UserBuild[];
}
