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
  readonly totalGaps: number;
  readonly resolvedCount: number;
  readonly isLoading: boolean;
  readonly canGoBack: boolean;
  resolve(gapId: string, value: unknown): Promise<void>;
  skip(gapId: string): void;
  goBack(): void;
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
  // Session-resolved set — used by ALL audiences so the next question advances
  // immediately after a successful save, without waiting on envelope refetch.
  // Athlete fix: prevents users from appearing "stuck" on the same question
  // when refetch is slow or cached.
  const [sessionResolved, setSessionResolved] = useState<Set<string>>(new Set());
  // Session-skipped set — user explicitly chose Skip; never imputes a value,
  // just removes from the queue for this session.
  const [sessionSkipped, setSessionSkipped] = useState<Set<string>>(new Set());
  // Session-reopened set — gaps the user navigated back to; forced back into
  // openGaps for athlete audience even if the stored context has a value.
  const [sessionReopened, setSessionReopened] = useState<Set<string>>(new Set());
  // Ordered history of gap IDs acted on this session (resolve or skip).
  const [history, setHistory] = useState<string[]>([]);

  const gapSet = useMemo(() => getKnowledgeGapsForAudience(audience), [audience]);

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
    for (const gap of gapSet) {
      const v = (coachScoutRow as Record<string, unknown>)[gap.persistTo];
      if (v == null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      seeded.add(gap.id);
    }
    if (seeded.size > 0) {
      setSessionResolved((prev) => {
        const next = new Set(prev);
        for (const id of seeded) next.add(id);
        return next;
      });
    }
  }, [audience, coachScoutRow, gapSet]);

  const openGaps = useMemo(() => {
    return gapSet
      .filter((g) => {
        if (sessionReopened.has(g.id)) return true;
        if (sessionResolved.has(g.id)) return false;
        if (sessionSkipped.has(g.id)) return false;
        if (audience === "athlete") {
          const v = ctx.get(g.contextKey);
          return v ? v.missing : true;
        }
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }, [audience, gapSet, ctx, sessionResolved, sessionSkipped, sessionReopened]);

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
        } else {
          await persistContextAnswer(user.id, gap.persistTo, v, "hammer_onboarding");
        }
      } catch (err) {
        console.error("[hammer onboarding] persist failed", { gapId, err });
        throw err;
      }

      // Advance immediately — do not wait on refetch.
      setSessionResolved((prev) => new Set(prev).add(gap.id));
      setSessionReopened((prev) => {
        if (!prev.has(gap.id)) return prev;
        const next = new Set(prev);
        next.delete(gap.id);
        return next;
      });
      setHistory((prev) => [...prev, gap.id]);

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
      // Skipping never imputes a value — missingness remains visible.
      // Mark session-skipped so the queue advances for athlete/coach/scout alike.
      setSessionSkipped((prev) => new Set(prev).add(gapId));
      setSessionReopened((prev) => {
        if (!prev.has(gapId)) return prev;
        const next = new Set(prev);
        next.delete(gapId);
        return next;
      });
      setHistory((prev) => [...prev, gapId]);
    },
    [],
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const last = prev[prev.length - 1];
      setSessionResolved((s) => {
        if (!s.has(last)) return s;
        const n = new Set(s);
        n.delete(last);
        return n;
      });
      setSessionSkipped((s) => {
        if (!s.has(last)) return s;
        const n = new Set(s);
        n.delete(last);
        return n;
      });
      setSessionReopened((s) => {
        const n = new Set(s);
        n.add(last);
        return n;
      });
      return next;
    });
  }, []);

  return {
    audience,
    openGaps,
    nextGap: openGaps[0] ?? null,
    totalGaps: gapSet.length,
    resolvedCount: gapSet.length - openGaps.length,
    isLoading: ctx.isLoading || audienceLoading,
    canGoBack: history.length > 0,
    resolve,
    skip,
    goBack,
  };
}

