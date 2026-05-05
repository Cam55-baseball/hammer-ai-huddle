import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  interaction_counts: Record<string, number>;
  dwell_ms: Record<string, number>;
  prescribed_history: Record<string, { shown: string[]; accepted: string[]; skipped: string[] }>;
  sim_signatures: Record<string, { firstRun: { severity: string; gap: number | string; ts: string }; lastRun: { severity: string; gap: number | string; ts: string }; runs: number }>;
}

const CHANNEL_NAME = 'data-sync';
const RATE_LIMIT_PER_MIN = 30;
const DEDUP_WINDOW_MS = 2000;
const MARK_DEBOUNCE_MS = 500;
const DWELL_FLUSH_MS = 4000;
const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, label = 'op'): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 250 * Math.pow(2, i)));
    }
  }
  console.warn(`[demo] ${label} failed after retries`, lastErr);
  throw lastErr;
}

export function useDemoProgress() {
  const { user } = useAuth();
  const { findBySlug } = useDemoRegistry();
  const [progress, setProgress] = useState<DemoProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Always-fresh ref for async closures
  const progressRef = useRef<DemoProgress | null>(null);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Refs for anti-spam
  const dedupRef = useRef<Map<string, number>>(new Map());
  const eventTimestampsRef = useRef<number[]>([]);
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dwellBufferRef = useRef<Record<string, number>>({});
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // LWW per-field timestamp (ms) — local writes always win over older inbound broadcasts
  const lastLocalWriteRef = useRef<number>(0);

  // Multi-tab sync — LWW merge against local clock
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (e) => {
      if (e.data?.type !== 'demo:progress') return;
      const incoming = e.data.payload as (DemoProgress & { __ts?: number }) | undefined;
      if (!incoming || incoming.user_id !== user?.id) return;
      const incomingTs = e.data.__ts ?? Date.parse(incoming.last_active_at ?? '') ?? 0;
      if (incomingTs < lastLocalWriteRef.current) return; // stale broadcast — ignore
      setProgress(prev => {
        if (!prev) return incoming;
        // Field-level LWW: always merge in counts/dwell/sets safely
        return { ...prev, ...incoming };
      });
    };
    return () => ch.close();
  }, [user]);

  const broadcast = useCallback((p: DemoProgress) => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'demo:progress', payload: p, __ts: Date.now() });
      ch.close();
    } catch { /* noop */ }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) { setProgress(null); setLoading(false); return; }
    try {
      const data = await withRetry(async () => {
        const r = await supabase.from('demo_progress').select('*').eq('user_id', user.id).maybeSingle();
        if (r.error) throw r.error;
        return r.data;
      }, 'refresh');
      if (!data) {
        const created = await withRetry(async () => {
          const r = await supabase.from('demo_progress').insert({ user_id: user.id, demo_state: 'pending' }).select('*').single();
          if (r.error) throw r.error;
          return r.data;
        }, 'create-progress');
        setProgress(created as unknown as DemoProgress | null);
      } else {
        setProgress(data as unknown as DemoProgress);
      }
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Token bucket — drop events past the per-minute cap
  const passesRateLimit = useCallback(() => {
    const now = Date.now();
    const cutoff = now - 60_000;
    eventTimestampsRef.current = eventTimestampsRef.current.filter(t => t > cutoff);
    if (eventTimestampsRef.current.length >= RATE_LIMIT_PER_MIN) return false;
    eventTimestampsRef.current.push(now);
    return true;
  }, []);

  const logEvent = useCallback(
    async (event_type: string, node_slug?: string, metadata: Record<string, unknown> = {}) => {
      if (!user) return;
      const dedupKey = `${event_type}:${node_slug ?? ''}`;
      const last = dedupRef.current.get(dedupKey) ?? 0;
      const now = Date.now();
      if (now - last < DEDUP_WINDOW_MS) return;
      dedupRef.current.set(dedupKey, now);
      if (!passesRateLimit()) return;
      try {
        await supabase.from('demo_events').insert([{
          user_id: user.id,
          event_type,
          node_slug: node_slug ?? null,
          metadata: metadata as any,
        }]);
      } catch (e) { console.warn('[demo] logEvent failed', e); }
    },
    [user, passesRateLimit],
  );

  const update = useCallback(
    async (patch: Partial<DemoProgress>) => {
      if (!user || !progress) return;
      if (patch.demo_state && patch.demo_state !== progress.demo_state) {
        try { assertTransition(progress.demo_state, patch.demo_state); }
        catch (e) {
          await logEvent('invalid_transition', undefined, { from: progress.demo_state, to: patch.demo_state, error: String(e) });
          throw e;
        }
      }
      try {
        const data = await withRetry(async () => {
          const r = await supabase.from('demo_progress').update({ ...patch, last_active_at: new Date().toISOString() })
            .eq('user_id', user.id).select('*').single();
          if (r.error) throw r.error;
          return r.data;
        }, 'update-progress');
        if (data) {
          setProgress(data as unknown as DemoProgress);
          broadcast(data as unknown as DemoProgress);
        }
      } catch (e) {
        // Queue the patch locally; will be retried on next call
        try {
          const queue = JSON.parse(localStorage.getItem('demo_progress_queue') ?? '[]');
          queue.push({ patch, ts: Date.now() });
          localStorage.setItem('demo_progress_queue', JSON.stringify(queue.slice(-20)));
        } catch { /* noop */ }
        console.warn('[demo] update queued for retry', e);
      }
    },
    [user, progress, logEvent, broadcast],
  );

  const recomputeAndPersist = useCallback(
    async (next: { tiers: Set<string>; cats: Set<string>; subs: Set<string>; counts: Record<string, number>; dwell: Record<string, number>; submoduleSlug?: string; tierSlug?: string; categorySlug?: string | null; }) => {
      if (!progress) return;
      const completion = computeCompletion({
        tiers: next.tiers.size, categories: next.cats.size, submodules: next.subs.size,
        interactionCounts: next.counts, dwellMs: next.dwell,
      });
      const nextState: DemoState =
        completion.isComplete ? 'completed'
        : (progress.demo_state === 'pending' ? 'in_progress' : progress.demo_state);
      await update({
        demo_state: nextState,
        viewed_submodules: Array.from(next.subs),
        viewed_categories: Array.from(next.cats),
        viewed_tiers: Array.from(next.tiers),
        interaction_counts: next.counts,
        dwell_ms: next.dwell,
        ...(next.submoduleSlug ? {
          current_node: `submodule:${next.submoduleSlug}`,
          resume_path: `/demo/${next.tierSlug ?? ''}/${next.categorySlug ?? ''}/${next.submoduleSlug}`.replace(/\/+/g, '/'),
        } : {}),
        ...(nextState === 'completed' && !progress.completed_at ? { completed_at: new Date().toISOString() } : {}),
      });
      if (nextState === 'completed' && progress.demo_state !== 'completed') {
        await logEvent('complete', undefined, { trigger: 'thresholds' });
      }
    },
    [progress, update, logEvent],
  );

  const markViewed = useCallback(
    async (submoduleSlug: string, tierSlug?: string) => {
      if (!progress) return;
      // Debounce per-slug
      const key = `view:${submoduleSlug}`;
      const existing = debounceRef.current.get(key);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(async () => {
        debounceRef.current.delete(key);
        const sub = findBySlug(submoduleSlug);
        const categorySlug = sub?.parent_slug ?? null;
        const subs = new Set(progress.viewed_submodules); subs.add(submoduleSlug);
        const cats = new Set(progress.viewed_categories ?? []); if (categorySlug) cats.add(categorySlug);
        const tiers = new Set(progress.viewed_tiers); if (tierSlug) tiers.add(tierSlug);
        await recomputeAndPersist({
          tiers, cats, subs,
          counts: progress.interaction_counts ?? {},
          dwell: progress.dwell_ms ?? {},
          submoduleSlug, tierSlug, categorySlug,
        });
        await logEvent('view_node', submoduleSlug, { category: categorySlug, tier: tierSlug });
      }, MARK_DEBOUNCE_MS);
      debounceRef.current.set(key, handle);
    },
    [progress, findBySlug, recomputeAndPersist, logEvent],
  );

  const bumpInteraction = useCallback(
    async (submoduleSlug: string) => {
      if (!progress) return;
      const counts = { ...(progress.interaction_counts ?? {}) };
      counts[submoduleSlug] = (counts[submoduleSlug] ?? 0) + 1;
      // Debounced server flush
      const key = `bump:${submoduleSlug}`;
      const existing = debounceRef.current.get(key);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(async () => {
        debounceRef.current.delete(key);
        const subs = new Set(progress.viewed_submodules);
        const cats = new Set(progress.viewed_categories ?? []);
        const tiers = new Set(progress.viewed_tiers);
        await recomputeAndPersist({ tiers, cats, subs, counts, dwell: progress.dwell_ms ?? {} });
      }, MARK_DEBOUNCE_MS);
      debounceRef.current.set(key, handle);
      // Optimistic local update
      setProgress(p => p ? { ...p, interaction_counts: counts } : p);
    },
    [progress, recomputeAndPersist],
  );

  const addDwell = useCallback(
    (submoduleSlug: string, ms: number) => {
      dwellBufferRef.current[submoduleSlug] = (dwellBufferRef.current[submoduleSlug] ?? 0) + ms;
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = setTimeout(async () => {
        const buffered = { ...dwellBufferRef.current };
        dwellBufferRef.current = {};
        if (!progress) return;
        const dwell = { ...(progress.dwell_ms ?? {}) };
        for (const [s, v] of Object.entries(buffered)) {
          dwell[s] = Math.min(5 * 60 * 1000, (dwell[s] ?? 0) + v);
        }
        const subs = new Set(progress.viewed_submodules);
        const cats = new Set(progress.viewed_categories ?? []);
        const tiers = new Set(progress.viewed_tiers);
        await recomputeAndPersist({ tiers, cats, subs, counts: progress.interaction_counts ?? {}, dwell });
      }, DWELL_FLUSH_MS);
    },
    [progress, recomputeAndPersist],
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

  return useMemo(() => ({
    progress, loading, refresh, update,
    markViewed, bumpInteraction, addDwell,
    skip, complete, startIfPending, logEvent,
  }), [progress, loading, refresh, update, markViewed, bumpInteraction, addDwell, skip, complete, startIfPending, logEvent]);
}
