/**
 * useGamePlanInUse
 *
 * Backs both controls on the game plan card:
 *
 * - `inUse` — the saved "Game plan in use?" yes/no answer.
 * - `open`  — the Hide / Show choice.
 *
 * Both are persisted per user in the existing `game_plan_user_preferences`
 * table (the app's established per-user preference store), so they survive
 * navigating into a module and back, a reload, and signing out and back in on
 * another device. localStorage is only a synchronous first-paint cache so the
 * card does not flash open and then snap shut.
 *
 * Answering the "in use" question re-syncs the card to that answer; after that
 * the Hide / Show button can move the card freely and that position is what
 * gets remembered.
 *
 * Two surfaces are tracked independently: the athlete card and the
 * scout/coach card.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type GamePlanSurface = 'athlete' | 'staff';

const IN_USE_COLUMN: Record<GamePlanSurface, 'plan_in_use_athlete' | 'plan_in_use_staff'> = {
  athlete: 'plan_in_use_athlete',
  staff: 'plan_in_use_staff',
};

const OPEN_COLUMN: Record<GamePlanSurface, 'plan_open_athlete' | 'plan_open_staff'> = {
  athlete: 'plan_open_athlete',
  staff: 'plan_open_staff',
};

const cacheKey = (surface: GamePlanSurface) => `gamePlan.inUse.v1.${surface}`;
const openCacheKey = (surface: GamePlanSurface) => `gamePlan.open.v1.${surface}`;

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return fallback;
}

function readCache(surface: GamePlanSurface): boolean {
  const value = readFlag(cacheKey(surface), true);
  if (!value) return false;
  // Legacy device-local "hidden" flag from the old eye-icon toggle.
  if (surface === 'athlete') {
    try {
      if (localStorage.getItem('gamePlan.hidden.v1') === '1') return false;
    } catch {
      /* ignore */
    }
  }
  return true;
}

/** The remembered Hide/Show position; defaults to the "in use" answer. */

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore quota errors */
  }
}

function writeCache(surface: GamePlanSurface, value: boolean) {
  writeFlag(cacheKey(surface), value);
  if (surface === 'athlete') {
    // Keep the legacy key in sync so nothing else resurrects a stale state.
    try {
      localStorage.setItem('gamePlan.hidden.v1', value ? '0' : '1');
    } catch {
      /* ignore */
    }
  }
}

export function useGamePlanInUse(surface: GamePlanSurface) {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const [inUse, setInUseState] = useState<boolean>(() => readCache(surface));
  // Owner ruling 2026-10-01: Game Plan ALWAYS begins closed, on every screen,
  // every visit. The open state is in-memory only — never restored from cache
  // or the server — so it can never be left open on return.
  const [open, setOpen] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('game_plan_user_preferences')
        .select(`${IN_USE_COLUMN[surface]}`)
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const row = data as Record<string, boolean | null>;
        const inUseValue = row[IN_USE_COLUMN[surface]];
        // Column absent/null on legacy rows → treat as "in use".
        const nextInUse = inUseValue === false ? false : true;
        setInUseState(nextInUse);
        writeCache(surface, nextInUse);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, surface]);

  const persist = useCallback(
    (patch: Record<string, boolean>) => {
      if (!userId) return;
      void supabase
        .from('game_plan_user_preferences')
        .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.error('Failed to save game plan preference', error);
        });
    },
    [userId],
  );

  /** Save the yes/no answer. Never opens the card — the athlete opens it. */
  const setInUse = useCallback(
    (value: boolean) => {
      setInUseState(value);
      if (!value) setOpen(false);
      writeCache(surface, value);
      persist({ [IN_USE_COLUMN[surface]]: value });
    },
    [persist, surface],
  );

  /** Hide / Show for this visit only. The next visit starts closed again. */
  const setOpenSession = useCallback((value: boolean) => setOpen(value), []);

  return { inUse, setInUse, open, setOpen: setOpenSession, hydrated };
}
