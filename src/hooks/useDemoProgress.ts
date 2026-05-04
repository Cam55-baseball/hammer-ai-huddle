import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoRegistry } from '@/hooks/useDemoRegistry';
import { computeCompletion } from '@/demo/completionRules';
import { assertTransition } from '@/demo/stateMachine';

export type DemoState = 'pending' | 'in_progress' | 'skipped' | 'completed';

export interface DemoProgress {
  user_id: string;
  demo_state: DemoState;
  current_node: string | null;
  viewed_submodules: string[];
  viewed_categories: string[];
  viewed_tiers: string[];
  skipped_at: string | null;
  completed_at: string | null;
  last_active_at: string;
  variant: string | null;
  incomplete: boolean;
  resume_path: string | null;
}

const CHANNEL_NAME = 'data-sync';

export function useDemoProgress() {
  const { user } = useAuth();
  const { findBySlug } = useDemoRegistry();
  const [progress, setProgress] = useState<DemoProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Multi-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (e) => {
      if (e.data?.type === 'demo:progress' && e.data.payload?.user_id === user?.id) {
        setProgress(e.data.payload as DemoProgress);
      }
    };
    return () => ch.close();
  }, [user]);

  const broadcast = useCallback((p: DemoProgress) => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'demo:progress', payload: p });
      ch.close();
    } catch { /* noop */ }
  }, []);

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
      if (!user || !progress) return;
      // Enforce state machine when state is changing
      if (patch.demo_state && patch.demo_state !== progress.demo_state) {
        try {
          assertTransition(progress.demo_state, patch.demo_state);
        } catch (e) {
          await logEvent('invalid_transition', undefined, {
            from: progress.demo_state, to: patch.demo_state, error: String(e),
          });
          throw e;
        }
      }
      const { data } = await supabase
        .from('demo_progress')
        .update({ ...patch, last_active_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (data) {
        setProgress(data as DemoProgress);
        broadcast(data as DemoProgress);
      }
    },
    [user, progress, logEvent, broadcast],
  );

  const markViewed = useCallback(
    async (submoduleSlug: string, tierSlug?: string) => {
      if (!progress) return;
      const sub = findBySlug(submoduleSlug);
      const categorySlug = sub?.parent_slug ?? null;

      const viewedSubs = new Set(progress.viewed_submodules);
      viewedSubs.add(submoduleSlug);
      const viewedCats = new Set(progress.viewed_categories ?? []);
      if (categorySlug) viewedCats.add(categorySlug);
      const viewedTiers = new Set(progress.viewed_tiers);
      if (tierSlug) viewedTiers.add(tierSlug);

      const completion = computeCompletion({
        tiers: viewedTiers.size,
        categories: viewedCats.size,
        submodules: viewedSubs.size,
      });

      const nextState: DemoState =
        completion.isComplete ? 'completed'
        : (progress.demo_state === 'pending' ? 'in_progress' : progress.demo_state);

      await update({
        demo_state: nextState,
        viewed_submodules: Array.from(viewedSubs),
        viewed_categories: Array.from(viewedCats),
        viewed_tiers: Array.from(viewedTiers),
        current_node: `submodule:${submoduleSlug}`,
        resume_path: `/demo/${tierSlug ?? ''}/${categorySlug ?? ''}/${submoduleSlug}`.replace(/\/+/g, '/'),
        ...(nextState === 'completed' && !progress.completed_at
          ? { completed_at: new Date().toISOString() }
          : {}),
      });
      await logEvent('view_node', submoduleSlug, { category: categorySlug, tier: tierSlug });
      if (nextState === 'completed' && progress.demo_state !== 'completed') {
        await logEvent('complete', undefined, { trigger: 'thresholds' });
      }
    },
    [progress, findBySlug, update, logEvent],
  );

  const skip = useCallback(async () => {
    await update({ demo_state: 'skipped', skipped_at: new Date().toISOString(), incomplete: true });
    await logEvent('skip');
  }, [update, logEvent]);

  const complete = useCallback(async () => {
    await update({ demo_state: 'completed', completed_at: new Date().toISOString() });
    await logEvent('complete', undefined, { trigger: 'manual' });
  }, [update, logEvent]);

  const startIfPending = useCallback(async () => {
    if (progress?.demo_state === 'pending') {
      await update({ demo_state: 'in_progress' });
      await logEvent('start');
    }
  }, [progress, update, logEvent]);

  return { progress, loading, refresh, update, markViewed, skip, complete, startIfPending, logEvent };
}
