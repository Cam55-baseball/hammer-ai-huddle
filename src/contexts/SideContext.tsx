import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export type Side = "L" | "R";
export type SideOrBoth = Side | "both";
export type Discipline = "hit" | "throw";

interface SidePref {
  last_used_side: Side | null;
  dominant_side: Side | null;
}

interface SideContextValue {
  /** Is the athlete a switch hitter? (controls picker visibility for hit) */
  isSwitchHitter: boolean;
  /** Is the athlete ambidextrous on throw? (controls picker visibility for throw) */
  isAmbidextrousThrower: boolean;
  /** Currently selected side per discipline (sticky, defaults to dominant) */
  selectedSide: Record<Discipline, Side>;
  /** Set the active side for a discipline; persists to db + localStorage */
  setSide: (discipline: Discipline, side: Side) => void;
  /** Whether the picker should render for this discipline */
  shouldShowPicker: (discipline: Discipline) => boolean;
  loading: boolean;
}

const SideContext = createContext<SideContextValue | null>(null);

const LS_KEY = "asb.sideContext.v1";

function readLocal(): Partial<Record<Discipline, Side>> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(state: Record<Discipline, Side>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

export function SideContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Pull identity (switch / ambi flags + primary sides) once per user.
  const identityQuery = useQuery({
    queryKey: ["side-identity", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("athlete_mpi_settings")
        .select("is_switch_hitter,is_ambidextrous_thrower,primary_batting_side,primary_throwing_hand")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  // Pull persisted preferences.
  const prefsQuery = useQuery({
    queryKey: ["side-prefs", user?.id],
    queryFn: async (): Promise<Record<Discipline, SidePref>> => {
      const empty: Record<Discipline, SidePref> = {
        hit: { last_used_side: null, dominant_side: null },
        throw: { last_used_side: null, dominant_side: null },
      };
      if (!user) return empty;
      const { data } = await supabase
        .from("athlete_side_preferences")
        .select("discipline,last_used_side,dominant_side")
        .eq("user_id", user.id);
      const out = { ...empty };
      (data ?? []).forEach((row: any) => {
        if (row.discipline === "hit" || row.discipline === "throw") {
          out[row.discipline as Discipline] = {
            last_used_side: row.last_used_side ?? null,
            dominant_side: row.dominant_side ?? null,
          };
        }
      });
      return out;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const identity = identityQuery.data;
  const prefs = prefsQuery.data;

  // Resolve initial side per discipline: last_used → dominant → primary → localStorage → 'R'
  const resolved = useMemo<Record<Discipline, Side>>(() => {
    const local = readLocal();
    const hitPrimary = (identity?.primary_batting_side === "L" || identity?.primary_batting_side === "R")
      ? identity.primary_batting_side as Side : null;
    const throwPrimary = (identity?.primary_throwing_hand === "L" || identity?.primary_throwing_hand === "R")
      ? identity.primary_throwing_hand as Side : null;
    return {
      hit: (prefs?.hit.last_used_side ?? prefs?.hit.dominant_side ?? hitPrimary ?? local.hit ?? "R") as Side,
      throw: (prefs?.throw.last_used_side ?? prefs?.throw.dominant_side ?? throwPrimary ?? local.throw ?? "R") as Side,
    };
  }, [identity, prefs]);

  const [selectedSide, setSelectedSide] = useState<Record<Discipline, Side>>(resolved);

  // Keep state in sync when async resolution lands.
  useEffect(() => {
    setSelectedSide(resolved);
  }, [resolved.hit, resolved.throw]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSide = useCallback((discipline: Discipline, side: Side) => {
    setSelectedSide(prev => {
      const next = { ...prev, [discipline]: side };
      writeLocal(next);
      return next;
    });
    if (user) {
      // Fire-and-forget upsert; never block UI.
      void supabase.from("athlete_side_preferences").upsert(
        { user_id: user.id, discipline, last_used_side: side },
        { onConflict: "user_id,discipline" },
      );
    }
  }, [user]);

  const isSwitchHitter = !!identity?.is_switch_hitter;
  const isAmbidextrousThrower = !!identity?.is_ambidextrous_thrower;

  const shouldShowPicker = useCallback((d: Discipline) => {
    if (d === "hit") return isSwitchHitter;
    if (d === "throw") return isAmbidextrousThrower;
    return false;
  }, [isSwitchHitter, isAmbidextrousThrower]);

  const value: SideContextValue = {
    isSwitchHitter,
    isAmbidextrousThrower,
    selectedSide,
    setSide,
    shouldShowPicker,
    loading: identityQuery.isLoading || prefsQuery.isLoading,
  };

  return <SideContext.Provider value={value}>{children}</SideContext.Provider>;
}

export function useSideContext(): SideContextValue {
  const ctx = useContext(SideContext);
  if (!ctx) {
    // Safe fallback so trees without provider don't crash (e.g. marketing pages).
    return {
      isSwitchHitter: false,
      isAmbidextrousThrower: false,
      selectedSide: { hit: "R", throw: "R" },
      setSide: () => {},
      shouldShowPicker: () => false,
      loading: false,
    };
  }
  return ctx;
}

/** Convenience: just the active side for a discipline. */
export function useActiveSide(discipline: Discipline): Side {
  return useSideContext().selectedSide[discipline];
}
