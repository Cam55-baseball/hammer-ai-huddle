import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type DemoState = 'pending' | 'in_progress' | 'skipped' | 'completed';

export interface DemoProgress {
  user_id: string;
  demo_state: DemoState;
  current_node: string | null;
  viewed_submodules: string[];
  viewed_tiers: string[];
  skipped_at: string | null;
  completed_at: string | null;
  last_active_at: string;
  variant: string | null;
}

export function useDemoProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<DemoProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('demo_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      // Auto-create pending row on first access
      const { data: created } = await supabase
        .from('demo_progress')
        .insert({ user_id: user.id, demo_state: 'pending' })
        .select('*')
        .single();
      setProgress(created as DemoProgress | null);
    } else {
      setProgress(data as DemoProgress);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const logEvent = useCallback(
    async (event_type: string, node_slug?: string, metadata: Record<string, unknown> = {}) => {
      if (!user) return;
      await supabase.from('demo_events').insert([{
        user_id: user.id,
        event_type,
        node_slug: node_slug ?? null,
        metadata: metadata as any,
      }]);
    },
    [user],
  );

  const update = useCallback(
    async (patch: Partial<DemoProgress>) => {
      if (!user) return;
      const { data } = await supabase
        .from('demo_progress')
        .update({ ...patch, last_active_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (data) setProgress(data as DemoProgress);
    },
    [user],
  );

  const markViewed = useCallback(
    async (submoduleSlug: string, tierSlug?: string) => {
      if (!progress) return;
      const viewed = new Set(progress.viewed_submodules);
      viewed.add(submoduleSlug);
      const tiers = new Set(progress.viewed_tiers);
      if (tierSlug) tiers.add(tierSlug);
      await update({
        demo_state: progress.demo_state === 'pending' ? 'in_progress' : progress.demo_state,
        viewed_submodules: Array.from(viewed),
        viewed_tiers: Array.from(tiers),
        current_node: `submodule:${submoduleSlug}`,
      });
      await logEvent('view_node', submoduleSlug);
    },
    [progress, update, logEvent],
  );

  const skip = useCallback(async () => {
    await update({ demo_state: 'skipped', skipped_at: new Date().toISOString() });
    await logEvent('skip');
  }, [update, logEvent]);

  const complete = useCallback(async () => {
    await update({ demo_state: 'completed', completed_at: new Date().toISOString() });
    await logEvent('complete');
  }, [update, logEvent]);

  const startIfPending = useCallback(async () => {
    if (progress?.demo_state === 'pending') {
      await update({ demo_state: 'in_progress' });
      await logEvent('start');
    }
  }, [progress, update, logEvent]);

  return { progress, loading, refresh, update, markViewed, skip, complete, startIfPending, logEvent };
}
