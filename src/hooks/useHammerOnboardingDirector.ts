/**
 * useHammerOnboardingDirector — Hammer-initiated knowledge gap acquisition.
 *
 * Role-aware: picks athlete / coach / scout gap set from `user_roles`.
 * Hardened resolve: surfaces errors to caller, never silently traps.
 *
 * Interpretive only: never authors organism truth. Athlete may always skip;
 * missingness is preserved, never imputed.
 */
import { useMemo, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import {
  persistContextAnswer,
  persistCoachContextAnswer,
  persistScoutContextAnswer,
  canonicalizeInjuryHistory,
} from "@/lib/hammer/context/acquisition";
import {
  fetchCoachContextRow,
  fetchScoutContextRow,
} from "@/lib/hammer/context/envelope";
import {
  getKnowledgeGapsForAudience,
  type GapAudience,
  type KnowledgeGap,
} from "@/lib/hammer/onboarding/knowledgeGaps";


export interface HammerOnboardingDirector {
  readonly audience: GapAudience;
  readonly openGaps: ReadonlyArray<KnowledgeGap>;
  readonly nextGap: KnowledgeGap | null;
  readonly currentGap: KnowledgeGap | null;
  readonly currentIndex: number;
  readonly totalGaps: number;
  readonly resolvedCount: number;
  readonly isLoading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly answers: Readonly<Record<string, unknown>>;
  setAnswer(gapId: string, value: unknown): void;
  resolve(gapId: string, value: unknown): Promise<void>;
  skip(gapId: string): void;
  goBack(): void;
  goForward(): void;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function toEditableAnswer(gap: KnowledgeGap, value: unknown): unknown {
  if (gap.inputKind === "text" && Array.isArray(value)) {
    return value.join(", ");
  }
  if (gap.inputKind === "injury" && Array.isArray(value)) {
    if (value.length === 0) return { status: "healthy" };
    const rows = value.filter((v): v is Record<string, unknown> => v != null && typeof v === "object");
    return {
      status: "managing",
      regions: rows.map((r) => r.region).filter((r): r is string => typeof r === "string"),
      severity: rows.find((r) => typeof r.severity === "string")?.severity,
      note: rows.map((r) => r.note).filter((n): n is string => typeof n === "string").join(", "),
    };
  }
  return value;
}

function useUserAudience(): { audience: GapAudience; loading: boolean } {
  const { user } = useAuth();
  const [audience, setAudience] = useState<GapAudience>("athlete");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["scout", "coach"]);
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role as string);
        if (roles.includes("scout")) setAudience("scout");
        else if (roles.includes("coach")) setAudience("coach");
        else setAudience("athlete");
      } catch {
        if (!cancelled) setAudience("athlete");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { audience, loading };
}

export function useHammerOnboardingDirector(): HammerOnboardingDirector {
  const { user } = useAuth();
  const ctx = useHammerAthleteContext();
  const qc = useQueryClient();
  const { audience, loading: audienceLoading } = useUserAudience();
  // Stable linear navigation: users can move question 1 → final and back without
  // saved answers disappearing. Missingness still drives progress, but never the
  // currently displayed question.
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sessionResolved, setSessionResolved] = useState<Set<string>>(new Set());
  const [sessionSkipped, setSessionSkipped] = useState<Set<string>>(new Set());

  const gapSet = useMemo(() => getKnowledgeGapsForAudience(audience), [audience]);

  useEffect(() => {
    setActiveIndex(0);
    setSessionResolved(new Set());
    setSessionSkipped(new Set());
    setAnswers({});
  }, [audience]);

  // Hydrate coach/scout previously-answered gaps so progress survives reload.
  const { data: coachScoutRow } = useQuery({
    queryKey: ["onboarding-progress", audience, user?.id],
    enabled: !!user && (audience === "coach" || audience === "scout"),
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return null;
      if (audience === "coach") return await fetchCoachContextRow(user.id);
      if (audience === "scout") return await fetchScoutContextRow(user.id);
      return null;
    },
  });

  // Seed `sessionResolved` from hydrated coach/scout row.
  useEffect(() => {
    if (audience === "athlete" || !coachScoutRow) return;
    const seeded = new Set<string>();
    const seededAnswers: Record<string, unknown> = {};
    for (const gap of gapSet) {
      const v = (coachScoutRow as Record<string, unknown>)[gap.persistTo];
      if (!hasMeaningfulValue(v)) continue;
      seeded.add(gap.id);
      seededAnswers[gap.id] = toEditableAnswer(gap, v);
    }
    if (seeded.size > 0) {
      setSessionResolved((prev) => {
        const next = new Set(prev);
        for (const id of seeded) next.add(id);
        return next;
      });
      setAnswers((prev) => ({ ...seededAnswers, ...prev }));
    }
  }, [audience, coachScoutRow, gapSet]);

  // Supplemental athlete hydration for the newer athlete_context columns that
  // the envelope RPC doesn't (yet) expose. Reads directly so returning users
  // see their previous fuel / mental / connections answers as resolved.
  const SUPPLEMENTAL_COLS = [
    "sleep_target_hrs",
    "water_goal_oz",
    "diet_style",
    "allergies",
    "level_target",
    "focus_area",
    "pregame_routine",
    "coach_code",
  ] as const;
  const { data: supplementalRow } = useQuery({
    queryKey: ["onboarding-supplemental-athlete", user?.id],
    enabled: !!user && audience === "athlete",
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase.from("athlete_context") as unknown as {
        select: (c: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
          };
        };
      })
        .select(SUPPLEMENTAL_COLS.join(","))
        .eq("user_id", user.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (audience !== "athlete" || !supplementalRow) return;
    const seeded = new Set<string>();
    const seededAnswers: Record<string, unknown> = {};
    for (const gap of gapSet) {
      if (!(SUPPLEMENTAL_COLS as readonly string[]).includes(gap.persistTo)) continue;
      const v = (supplementalRow as Record<string, unknown>)[gap.persistTo];
      if (!hasMeaningfulValue(v)) continue;
      seeded.add(gap.id);
      seededAnswers[gap.id] = v;
    }
    if (seeded.size === 0) return;
    setSessionResolved((prev) => {
      const next = new Set(prev);
      for (const id of seeded) next.add(id);
      return next;
    });
    setAnswers((prev) => ({ ...seededAnswers, ...prev }));
  }, [audience, supplementalRow, gapSet]);

  useEffect(() => {
    if (audience !== "athlete") return;
    const seeded = new Set<string>();
    const seededAnswers: Record<string, unknown> = {};
    for (const gap of gapSet) {
      const variable = ctx.get(gap.contextKey);
      if (!variable || variable.missing) continue;
      if (gap.id === "injury_history" && Array.isArray(variable.value) && variable.value.length === 0) {
        seeded.add(gap.id);
        seededAnswers[gap.id] = { status: "healthy" };
        continue;
      }
      if (!hasMeaningfulValue(variable.value)) continue;
      seeded.add(gap.id);
      seededAnswers[gap.id] = toEditableAnswer(gap, variable.value);
    }
    if (seeded.size === 0 && Object.keys(seededAnswers).length === 0) return;
    setSessionResolved((prev) => {
      const next = new Set(prev);
      for (const id of seeded) next.add(id);
      return next;
    });
    setAnswers((prev) => ({ ...seededAnswers, ...prev }));
  }, [audience, gapSet, ctx]);

  const openGaps = useMemo(() => {
    return gapSet
      .filter((g) => {
        if (sessionResolved.has(g.id)) return false;
        if (sessionSkipped.has(g.id)) return false;
        if (audience === "athlete") {
          const v = ctx.get(g.contextKey);
          return v ? v.missing : true;
        }
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }, [audience, gapSet, ctx, sessionResolved, sessionSkipped]);

  const orderedGaps = useMemo(
    () => [...gapSet].sort((a, b) => a.priority - b.priority),
    [gapSet],
  );

  const currentGap = orderedGaps[activeIndex] ?? null;

  const setAnswer = useCallback((gapId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [gapId]: value }));
  }, []);

  const resolve = useCallback(
    async (gapId: string, value: unknown) => {
      if (!user) throw new Error("Not signed in");
      const gap = gapSet.find((g) => g.id === gapId);
      if (!gap) throw new Error(`Unknown gap: ${gapId}`);

      // Normalize per persist target.
      let v: unknown = value;
      if (gap.persistTo === "training_focus" || gap.persistTo === "development_priorities") {
        if (typeof value === "string") {
          v = value
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      if (gap.persistTo === "other_sports" && typeof value === "string") {
        v = value
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (gap.persistTo === "regions" && typeof value === "string") {
        v = value
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (gap.persistTo === "injury_history") {
        v = canonicalizeInjuryHistory(value);
      }

      try {
        if (audience === "coach") {
          await persistCoachContextAnswer(user.id, gap.persistTo, v);
        } else if (audience === "scout") {
          await persistScoutContextAnswer(user.id, gap.persistTo, v);
        } else if (gap.persistTo === "competition_level" && v && typeof v === "object") {
          // Composite competition selection — fan out to individual columns.
          const c = v as {
            level?: string;
            ageGroup?: string;
            homeState?: string;
            playState?: string;
            events?: string[];
          };
          if (typeof c.level === "string" && c.level) {
            await persistContextAnswer(user.id, "competition_level", c.level, "hammer_onboarding");
          }
          if (typeof c.ageGroup === "string" && c.ageGroup) {
            await persistContextAnswer(user.id, "competition_age_group", c.ageGroup, "hammer_onboarding");
          }
          if (typeof c.homeState === "string" && c.homeState) {
            await persistContextAnswer(user.id, "competition_home_state", c.homeState, "hammer_onboarding");
          }
          if (typeof c.playState === "string" && c.playState) {
            await persistContextAnswer(user.id, "competition_play_state", c.playState, "hammer_onboarding");
          }
          if (Array.isArray(c.events)) {
            await persistContextAnswer(user.id, "competition_events", c.events, "hammer_onboarding");
          }
        } else {
          await persistContextAnswer(user.id, gap.persistTo, v, "hammer_onboarding");
        }
      } catch (err) {
        console.error("[hammer onboarding] persist failed", { gapId, err });
        throw err;
      }

      // Advance immediately — do not wait on refetch.
      setSessionResolved((prev) => new Set(prev).add(gap.id));
      setSessionSkipped((prev) => {
        if (!prev.has(gap.id)) return prev;
        const next = new Set(prev);
        next.delete(gap.id);
        return next;
      });
      setAnswers((prev) => ({ ...prev, [gap.id]: value }));

      // Best-effort cache refresh — never block forward progress on this.
      try {
        await qc.invalidateQueries({ queryKey: ["hammer-context-envelope", user.id] });
        await qc.invalidateQueries({ queryKey: ["onboarding-progress", audience, user.id] });
      } catch (err) {
        console.warn("[hammer onboarding] cache invalidation failed (non-fatal)", err);
      }
    },
    [user, audience, gapSet, qc],
  );

  const skip = useCallback(
    (gapId: string) => {
      // Skipping never imputes a value — missingness remains visible. It is only
      // a session-level progress marker and does not affect back/forward history.
      setSessionSkipped((prev) => new Set(prev).add(gapId));
    },
    [],
  );

  const goBack = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goForward = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, orderedGaps.length));
  }, [orderedGaps.length]);

  const jumpTo = useCallback(
    (index: number) => {
      if (!Number.isFinite(index)) return;
      const clamped = Math.max(0, Math.min(Math.floor(index), orderedGaps.length - 1));
      setActiveIndex(clamped);
    },
    [orderedGaps.length],
  );

  return {
    audience,
    openGaps,
    orderedGaps,
    nextGap: currentGap,
    currentGap,
    currentIndex: activeIndex,
    totalGaps: orderedGaps.length,
    resolvedCount: gapSet.length - openGaps.length,
    isLoading: ctx.isLoading || audienceLoading,
    canGoBack: activeIndex > 0,
    canGoForward: activeIndex < orderedGaps.length - 1,
    answers,
    setAnswer,
    resolve,
    skip,
    goBack,
    goForward,
    jumpTo,
  };
}


