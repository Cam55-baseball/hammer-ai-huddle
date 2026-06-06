/**
 * useHammerOnboardingDirector — Hammer-initiated knowledge gap acquisition.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section B).
 *
 * Scans `useHammerAthleteContext` against `HAMMER_KNOWLEDGE_GAPS` and returns
 * the ordered list of open gaps + the next question Hammer should ask.
 * Persists answers to `profiles` and refreshes the context query.
 *
 * Interpretive only: never authors organism truth. Athlete may always skip;
 * missingness is preserved, never imputed.
 */
import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import {
  HAMMER_KNOWLEDGE_GAPS,
  type KnowledgeGap,
} from "@/lib/hammer/onboarding/knowledgeGaps";

export interface HammerOnboardingDirector {
  readonly openGaps: ReadonlyArray<KnowledgeGap>;
  readonly nextGap: KnowledgeGap | null;
  readonly totalGaps: number;
  readonly resolvedCount: number;
  readonly isLoading: boolean;
  resolve(gapId: string, value: string | number): Promise<void>;
  skip(gapId: string): void;
}

export function useHammerOnboardingDirector(): HammerOnboardingDirector {
  const { user } = useAuth();
  const ctx = useHammerAthleteContext();
  const qc = useQueryClient();

  const openGaps = useMemo(() => {
    return HAMMER_KNOWLEDGE_GAPS.filter((g) => {
      const v = ctx.get(g.contextKey);
      return v ? v.missing : true;
    }).sort((a, b) => a.priority - b.priority);
  }, [ctx]);

  const resolve = useCallback(
    async (gapId: string, value: string | number) => {
      if (!user) return;
      const gap = HAMMER_KNOWLEDGE_GAPS.find((g) => g.id === gapId);
      if (!gap) return;
      try {
        // Normalize array-style spine keys from free-text input.
        let v: unknown = value;
        if (gap.persistTo === "training_focus" || gap.persistTo === "development_priorities") {
          v = String(value)
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (gap.persistTo === "injury_history") {
          const s = String(value).trim().toLowerCase();
          v = s === "" || s === "none" || s === "no" ? [] : [{ note: String(value), reported_at: new Date().toISOString() }];
        }
        await persistContextAnswer(user.id, gap.persistTo, v, "hammer_onboarding");
      } catch (err) {
        console.error("[hammer onboarding] resolve failed", err);
        return;
      }
      qc.invalidateQueries({ queryKey: ["hammer-context-envelope", user.id] });
    },
    [user, qc],
  );

  const skip = useCallback((gapId: string) => {
    // Skipping never imputes a value — missingness remains visible.
    void gapId;
  }, []);

  return {
    openGaps,
    nextGap: openGaps[0] ?? null,
    totalGaps: HAMMER_KNOWLEDGE_GAPS.length,
    resolvedCount: HAMMER_KNOWLEDGE_GAPS.length - openGaps.length,
    isLoading: ctx.isLoading,
    resolve,
    skip,
  };
}
