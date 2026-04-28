/**
 * useGamePlanPreferences
 *
 * Single source of truth for the user's Game Plan sort mode and the
 * user-defined activity orders for each mode. Persisted server-side in
 * `game_plan_user_preferences` so the choices survive across devices,
 * sessions, refreshes, and PWA reinstalls.
 *
 * Cross-tab sync uses BroadcastChannel('data-sync') with TAB_ID per the
 * project's multi-tab synchronization rule. Cross-device sync uses
 * Supabase realtime on the same row.
 *
 * localStorage is kept only as a synchronous first-paint cache so the
 * UI doesn't flicker between mount and the initial DB hydration. The DB
 * row is always authoritative once it loads.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { TAB_ID } from '@/utils/tabId';

export type SortMode = 'auto' | 'manual' | 'timeline';
export type ManualSection = 'checkin' | 'training' | 'tracking' | 'custom';

interface PreferencesRow {
  user_id: string;
  sort_mode: SortMode;
  timeline_order: string[];
  manual_order_checkin: string[];
  manual_order_training: string[];
  manual_order_tracking: string[];
  manual_order_custom: string[];
}

interface PreferencesState {
  sortMode: SortMode;
  timelineOrder: string[];
  manualOrders: Record<ManualSection, string[]>;
}

const SECTION_TO_COLUMN: Record<ManualSection, keyof PreferencesRow> = {
  checkin: 'manual_order_checkin',
  training: 'manual_order_training',
  tracking: 'manual_order_tracking',
  custom: 'manual_order_custom',
};

const LS_KEYS = {
  sortMode: 'gameplan-sort-mode',
  timeline: 'gameplan-timeline-order',
  checkin: 'gameplan-checkin-order',
  training: 'gameplan-training-order',
  tracking: 'gameplan-tracking-order',
  custom: 'gameplan-custom-order',
  migrated: 'gameplan-prefs-migrated',
} as const;

const readLocalArray = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const readLocalSortMode = (): SortMode => {
  const stored = localStorage.getItem(LS_KEYS.sortMode);
  if (stored === 'manual' || stored === 'timeline' || stored === 'auto') return stored;
  return 'auto';
};

const initialFromCache = (): PreferencesState => ({
  sortMode: readLocalSortMode(),
  timelineOrder: readLocalArray(LS_KEYS.timeline),
  manualOrders: {
    checkin: readLocalArray(LS_KEYS.checkin),
    training: readLocalArray(LS_KEYS.training),
    tracking: readLocalArray(LS_KEYS.tracking),
    custom: readLocalArray(LS_KEYS.custom),
  },
});

const rowToState = (row: PreferencesRow): PreferencesState => ({
  sortMode: row.sort_mode,
  timelineOrder: row.timeline_order ?? [],
  manualOrders: {
    checkin: row.manual_order_checkin ?? [],
    training: row.manual_order_training ?? [],
    tracking: row.manual_order_tracking ?? [],
    custom: row.manual_order_custom ?? [],
  },
});

const writeLocalCache = (next: PreferencesState) => {
  try {
    localStorage.setItem(LS_KEYS.sortMode, next.sortMode);
    localStorage.setItem(LS_KEYS.timeline, JSON.stringify(next.timelineOrder));
    localStorage.setItem(LS_KEYS.checkin, JSON.stringify(next.manualOrders.checkin));
    localStorage.setItem(LS_KEYS.training, JSON.stringify(next.manualOrders.training));
    localStorage.setItem(LS_KEYS.tracking, JSON.stringify(next.manualOrders.tracking));
    localStorage.setItem(LS_KEYS.custom, JSON.stringify(next.manualOrders.custom));
  } catch {
    // ignore quota errors
  }
};

export function useGamePlanPreferences() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const [state, setState] = useState<PreferencesState>(() => initialFromCache());
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // BroadcastChannel for same-device cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('data-sync');
    channelRef.current = ch;
    const handler = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg || msg.type !== 'gameplan-prefs') return;
      if (msg.tabId === TAB_ID) return;
      if (!msg.payload) return;
      const next = msg.payload as PreferencesState;
      setState(next);
      writeLocalCache(next);
    };
    ch.addEventListener('message', handler);
    return () => {
      ch.removeEventListener('message', handler);
      ch.close();
      channelRef.current = null;
    };
  }, []);

  // Hydrate from server (and migrate localStorage on first run if row is empty)
  useEffect(() => {
    if (!userId) {
      setIsHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('game_plan_user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        // On error, keep cache; mark hydrated so writes can proceed.
        setIsHydrated(true);
        return;
      }

      if (!data) {
        // No row yet — migrate localStorage cache up to the server (one-time).
        const cache = initialFromCache();
        const alreadyMigrated = localStorage.getItem(LS_KEYS.migrated) === '1';
        const payload: Omit<PreferencesRow, never> = {
          user_id: userId,
          sort_mode: cache.sortMode,
          timeline_order: cache.timelineOrder,
          manual_order_checkin: cache.manualOrders.checkin,
          manual_order_training: cache.manualOrders.training,
          manual_order_tracking: cache.manualOrders.tracking,
          manual_order_custom: cache.manualOrders.custom,
        };
        const { data: inserted } = await supabase
          .from('game_plan_user_preferences')
          .upsert(payload, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle();
        if (cancelled) return;
        if (!alreadyMigrated) localStorage.setItem(LS_KEYS.migrated, '1');
        if (inserted) {
          const next = rowToState(inserted as PreferencesRow);
          setState(next);
          writeLocalCache(next);
        }
        setIsHydrated(true);
        return;
      }

      const next = rowToState(data as PreferencesRow);
      setState(next);
      writeLocalCache(next);
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Realtime subscription so other devices/tabs reflect remote changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`gameplan-prefs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_plan_user_preferences',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as PreferencesRow | undefined;
          if (!row || !row.user_id) return;
          const next = rowToState(row);
          // Only update if actually different to avoid render loops
          const cur = stateRef.current;
          if (
            cur.sortMode === next.sortMode &&
            JSON.stringify(cur.timelineOrder) === JSON.stringify(next.timelineOrder) &&
            JSON.stringify(cur.manualOrders) === JSON.stringify(next.manualOrders)
          ) {
            return;
          }
          setState(next);
          writeLocalCache(next);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Debounced server write + broadcast. Always writes the latest stateRef.
  const scheduleWrite = useCallback(() => {
    if (!userId) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      const cur = stateRef.current;
      const payload = {
        user_id: userId,
        sort_mode: cur.sortMode,
        timeline_order: cur.timelineOrder,
        manual_order_checkin: cur.manualOrders.checkin,
        manual_order_training: cur.manualOrders.training,
        manual_order_tracking: cur.manualOrders.tracking,
        manual_order_custom: cur.manualOrders.custom,
      };
      await supabase
        .from('game_plan_user_preferences')
        .upsert(payload, { onConflict: 'user_id' });
      // Broadcast to sibling tabs after persistence so they don't race.
      channelRef.current?.postMessage({
        type: 'gameplan-prefs',
        tabId: TAB_ID,
        payload: cur,
      });
    }, 400);
  }, [userId]);

  const setSortMode = useCallback(
    (mode: SortMode) => {
      setState((prev) => {
        if (prev.sortMode === mode) return prev;
        const next = { ...prev, sortMode: mode };
        writeLocalCache(next);
        return next;
      });
      scheduleWrite();
    },
    [scheduleWrite],
  );

  const setTimelineOrder = useCallback(
    (ids: string[]) => {
      setState((prev) => {
        if (JSON.stringify(prev.timelineOrder) === JSON.stringify(ids)) return prev;
        const next = { ...prev, timelineOrder: [...ids] };
        writeLocalCache(next);
        return next;
      });
      scheduleWrite();
    },
    [scheduleWrite],
  );

  const setManualOrder = useCallback(
    (section: ManualSection, ids: string[]) => {
      setState((prev) => {
        if (JSON.stringify(prev.manualOrders[section]) === JSON.stringify(ids)) return prev;
        const next = {
          ...prev,
          manualOrders: { ...prev.manualOrders, [section]: [...ids] },
        };
        writeLocalCache(next);
        return next;
      });
      scheduleWrite();
    },
    [scheduleWrite],
  );

  // Flush pending write on unload so a fast tab close doesn't lose it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flush = () => {
      if (writeTimer.current) {
        clearTimeout(writeTimer.current);
        writeTimer.current = null;
      }
      if (!userId) return;
      const cur = stateRef.current;
      // Best-effort synchronous-ish write — supabase-js fetch is async, but
      // the browser will usually let it complete on visibilitychange.
      void supabase
        .from('game_plan_user_preferences')
        .upsert(
          {
            user_id: userId,
            sort_mode: cur.sortMode,
            timeline_order: cur.timelineOrder,
            manual_order_checkin: cur.manualOrders.checkin,
            manual_order_training: cur.manualOrders.training,
            manual_order_tracking: cur.manualOrders.tracking,
            manual_order_custom: cur.manualOrders.custom,
          },
          { onConflict: 'user_id' },
        );
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId]);

  return {
    sortMode: state.sortMode,
    timelineOrder: state.timelineOrder,
    manualOrders: state.manualOrders,
    isHydrated,
    setSortMode,
    setTimelineOrder,
    setManualOrder,
  };
}
