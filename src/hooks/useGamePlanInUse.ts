/**
 * useGamePlanInUse
 *
 * Backs the "Game plan in use?" yes/no answer that decides whether a game plan
 * card opens expanded or starts collapsed.
 *
 * - `inUse` is a persisted per-user preference (server-side in
 *   `game_plan_user_preferences`, so it survives devices and reinstalls).
 *   localStorage is only a synchronous first-paint cache so the card doesn't
 *   flash open then snap shut.
 * - `open` is the live collapse state for this visit. It is *seeded* from
 *   `inUse` and can be toggled freely without changing the saved answer, so a
 *   "no" user can still peek at the card without being re-asked next time.
 *
 * Two surfaces are tracked independently: the athlete card and the
 * scout/coach card.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type GamePlanSurface = 'athlete' | 'staff';

const COLUMN: Record<GamePlanSurface, 'plan_in_use_athlete' | 'plan_in_use_staff'> = {
  athlete: 'plan_in_use_athlete',
  staff: 'plan_in_use_staff',
};

const cacheKey = (surface: GamePlanSurface) => `gamePlan.inUse.v1.${surface}`;

function readCache(surface: GamePlanSurface): boolean {
  try {
    const raw = localStorage.getItem(cacheKey(surface));
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
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

function writeCache(surface: GamePlanSurface, value: boolean) {
  try {
    localStorage.setItem(cacheKey(surface), value ? '1' : '0');
    if (surface === 'athlete') {
      // Keep the legacy key in sync so nothing else resurrects a stale state.
      localStorage.setItem('gamePlan.hidden.v1', value ? '0' : '1');
    }
  } catch {
    /* ignore quota errors */
  }
}

export function useGamePlanInUse(surface: GamePlanSurface) {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const [inUse, setInUseState] = useState<boolean>(() => readCache(surface));
  const [open, setOpen] = useState<boolean>(() => readCache(surface));
  const [hydrated, setHydrated] = useState(false);
  // The visitor's manual expand/collapse wins over a later server hydration.
  const touched = useRef(false);

  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('game_plan_user_preferences')
        .select(COLUMN[surface])
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const value = (data as Record<string, boolean | null>)[COLUMN[surface]];
        // Column absent/null on legacy rows → treat as "in use".
        const next = value === false ? false : true;
        setInUseState(next);
        writeCache(surface, next);
        if (!touched.current) setOpen(next);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, surface]);

  /** Save the yes/no answer and re-sync the card to it immediately. */
  const setInUse = useCallback(
    (value: boolean) => {
      setInUseState(value);
      setOpen(value);
      touched.current = false;
      writeCache(surface, value);
      if (!userId) return;
      void supabase
        .from('game_plan_user_preferences')
        .upsert({ user_id: userId, [COLUMN[surface]]: value }, { onConflict: 'user_id' });
    },
    [userId, surface],
  );

  /** Expand/collapse for this visit only — does not change the saved answer. */
  const setOpenManual = useCallback((value: boolean) => {
    touched.current = true;
    setOpen(value);
  }, []);

  return { inUse, setInUse, open, setOpen: setOpenManual, hydrated };
}
