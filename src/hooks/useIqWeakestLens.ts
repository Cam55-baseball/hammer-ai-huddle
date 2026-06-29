/**
 * Wave 6 — IQ learning loop signal.
 *
 * Computes the athlete's weakest Game-IQ lens (defense | offense | pitching |
 * baserunning) from `iq_user_progress` joined to `iq_situations.lens_tags`.
 * Returns `null` when the sample is below the floor — never invents a signal.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { IqLens } from "@/lib/iq/types";

const MIN_ATTEMPTS_PER_LENS = 3;

export interface IqLensSnapshot {
  weakest: IqLens | null;
  perLens: Partial<Record<IqLens, { attempts: number; mastery: number }>>;
  totalAttempts: number;
}

export function useIqWeakestLens() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["iq-weakest-lens", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<IqLensSnapshot> => {
      const empty: IqLensSnapshot = { weakest: null, perLens: {}, totalAttempts: 0 };
      if (!user) return empty;

      const { data: progress, error: pErr } = await supabase
        .from("iq_user_progress")
        .select("situation_id, mastery_score, lifetime_attempts")
        .eq("user_id", user.id);
      if (pErr) throw pErr;
      if (!progress?.length) return empty;

      const ids = progress.map((p) => p.situation_id);
      const { data: sits, error: sErr } = await supabase
        .from("iq_situations")
        .select("id, lens_tags")
        .in("id", ids);
      if (sErr) throw sErr;

      const tagMap = new Map<string, string[]>();
      for (const s of sits ?? []) tagMap.set(s.id as string, (s.lens_tags as string[]) ?? []);

      const buckets: Partial<Record<IqLens, { attempts: number; mWeighted: number }>> = {};
      let totalAttempts = 0;
      for (const row of progress) {
        const tags = tagMap.get(row.situation_id as string) ?? [];
        const attempts = Number(row.lifetime_attempts ?? 0);
        const mastery = Number(row.mastery_score ?? 0);
        totalAttempts += attempts;
        for (const t of tags) {
          if (t !== "defense" && t !== "offense" && t !== "pitching" && t !== "baserunning") continue;
          const lens = t as IqLens;
          const b = buckets[lens] ?? { attempts: 0, mWeighted: 0 };
          b.attempts += attempts;
          b.mWeighted += mastery * attempts;
          buckets[lens] = b;
        }
      }

      const perLens: IqLensSnapshot["perLens"] = {};
      let weakest: IqLens | null = null;
      let weakestScore = Infinity;
      for (const k of Object.keys(buckets) as IqLens[]) {
        const b = buckets[k]!;
        const mastery = b.attempts > 0 ? b.mWeighted / b.attempts : 0;
        perLens[k] = { attempts: b.attempts, mastery };
        if (b.attempts >= MIN_ATTEMPTS_PER_LENS && mastery < weakestScore) {
          weakestScore = mastery;
          weakest = k;
        }
      }

      return { weakest, perLens, totalAttempts };
    },
  });
}
