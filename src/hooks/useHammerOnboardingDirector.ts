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
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import {
  persistContextAnswer,
  persistCoachContextAnswer,
  persistScoutContextAnswer,
} from "@/lib/hammer/context/acquisition";
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
  resolve(gapId: string, value: unknown): Promise<void>;
  skip(gapId: string): void;
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
  const [coachScoutResolved, setCoachScoutResolved] = useState<Set<string>>(new Set());

  const gapSet = useMemo(() => getKnowledgeGapsForAudience(audience), [audience]);

  const openGaps = useMemo(() => {
    if (audience === "athlete") {
      return gapSet
        .filter((g) => {
          const v = ctx.get(g.contextKey);
          return v ? v.missing : true;
        })
        .sort((a, b) => a.priority - b.priority);
    }
    // Coach/scout: gaps remain "open" until resolved this session.
    // (A future load could hydrate from coach_context/scout_context.)
    return gapSet
      .filter((g) => !coachScoutResolved.has(g.id))
      .sort((a, b) => a.priority - b.priority);
  }, [audience, gapSet, ctx, coachScoutResolved]);

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
        // Accept structured injury payload OR free text. Empty / "none" → [].
        if (Array.isArray(value)) {
          v = value;
        } else if (value && typeof value === "object") {
          v = [{ ...(value as Record<string, unknown>), reported_at: new Date().toISOString() }];
        } else {
          const s = String(value ?? "").trim().toLowerCase();
          v =
            s === "" || s === "none" || s === "no"
              ? []
              : [{ note: String(value), reported_at: new Date().toISOString() }];
        }
      }

      try {
        if (audience === "coach") {
          await persistCoachContextAnswer(user.id, gap.persistTo, v);
          setCoachScoutResolved((prev) => new Set(prev).add(gap.id));
        } else if (audience === "scout") {
          await persistScoutContextAnswer(user.id, gap.persistTo, v);
          setCoachScoutResolved((prev) => new Set(prev).add(gap.id));
        } else {
          await persistContextAnswer(user.id, gap.persistTo, v, "hammer_onboarding");
        }
      } catch (err) {
        // Re-throw so the UI can show it; do not silently advance.
        console.error("[hammer onboarding] persist failed", { gapId, err });
        throw err;
      }

      // Best-effort cache refresh — never block forward progress on this.
      try {
        await qc.invalidateQueries({ queryKey: ["hammer-context-envelope", user.id] });
      } catch (err) {
        console.warn("[hammer onboarding] cache invalidation failed (non-fatal)", err);
      }
    },
    [user, audience, gapSet, qc],
  );

  const skip = useCallback(
    (gapId: string) => {
      // Skipping never imputes a value — missingness remains visible.
      // For coach/scout, mark resolved-in-session so we advance.
      if (audience !== "athlete") {
        setCoachScoutResolved((prev) => new Set(prev).add(gapId));
      }
    },
    [audience],
  );

  return {
    audience,
    openGaps,
    nextGap: openGaps[0] ?? null,
    totalGaps: gapSet.length,
    resolvedCount: gapSet.length - openGaps.length,
    isLoading: ctx.isLoading || audienceLoading,
    resolve,
    skip,
  };
}
