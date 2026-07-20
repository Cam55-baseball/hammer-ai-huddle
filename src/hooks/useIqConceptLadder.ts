/**
 * useIqConceptLadder — groups published situations by concept and merges in
 * the athlete's per-concept mastery, difficulty rung state, and lock/gate
 * status derived from `iq_concept_tags.requires_concept_ids`.
 *
 * Safe fallbacks: if no concept tags are seeded yet, it returns a single
 * synthetic "All situations" concept so the ladder still renders.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { IqSituation, IqSport } from "@/lib/iq/types";
import { decayMastery, type IqConcept } from "@/lib/iq/concepts";

export interface LadderSituation {
  situation: IqSituation;
  mastery: number;
  rung: number;
  locked: boolean;
}
export interface LadderConcept {
  concept: IqConcept;
  mastery: number;
  situations: LadderSituation[];
  locked: boolean;
  lockedByLabels: string[];
  attempted: number;
  masteredCount: number;
  unlockedRung: number; // highest rung the athlete has access to (1..5)
}

const RUNG_UNLOCK_THRESHOLD = 70; // pct
const CONCEPT_UNLOCK_THRESHOLD = 60;

export function useIqConceptLadder(sport: IqSport) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: ["iq-concept-ladder", sport, uid ?? "anon"],
    queryFn: async (): Promise<LadderConcept[]> => {
      const sportFilter = sport === "both" ? ["baseball", "softball", "both"] : [sport, "both"];

      const [conceptsRes, sitsRes, linksRes, masteryRes, progressRes] = await Promise.all([
        supabase.from("iq_concept_tags").select("*").in("sport", sportFilter),
        supabase
          .from("iq_situations")
          .select("*")
          .in("sport", sportFilter)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("canonical_order", { ascending: true }),
        supabase.from("iq_situation_concepts").select("concept_id, situation_id"),
        uid
          ? supabase
              .from("iq_user_concept_mastery")
              .select("concept_id, mastery_score, last_touched_at")
              .eq("user_id", uid)
          : Promise.resolve({ data: [] as any[], error: null } as any),
        uid
          ? supabase
              .from("iq_user_progress")
              .select("situation_id, mastery_score")
              .eq("user_id", uid)
          : Promise.resolve({ data: [] as any[], error: null } as any),
      ]);

      const concepts = (conceptsRes.data ?? []) as unknown as (IqConcept & { requires_concept_ids?: string[] })[];
      const situations = (sitsRes.data ?? []) as unknown as (IqSituation & { difficulty_rung?: number })[];
      const links = (linksRes.data ?? []) as unknown as { concept_id: string; situation_id: string }[];
      const mastery = (masteryRes.data ?? []) as unknown as { concept_id: string; mastery_score: number; last_touched_at: string | null }[];
      const progress = (progressRes.data ?? []) as unknown as { situation_id: string; mastery_score: number }[];

      const masteryById = new Map<string, number>();
      mastery.forEach((m) => masteryById.set(m.concept_id, decayMastery(m.mastery_score, m.last_touched_at)));

      const progressBySit = new Map<string, number>();
      progress.forEach((p) => progressBySit.set(p.situation_id, p.mastery_score));

      const sitById = new Map(situations.map((s) => [s.id, s] as const));

      // Group situations by concept
      const sitsByConcept = new Map<string, IqSituation[]>();
      links.forEach((l) => {
        const s = sitById.get(l.situation_id);
        if (!s) return;
        if (!sitsByConcept.has(l.concept_id)) sitsByConcept.set(l.concept_id, []);
        sitsByConcept.get(l.concept_id)!.push(s);
      });

      // Fallback: if no concepts seeded, return a synthetic bucket
      if (concepts.length === 0) {
        const situationsRung: LadderSituation[] = situations.map((s) => ({
          situation: s,
          mastery: progressBySit.get(s.id) ?? 0,
          rung: (s.difficulty_rung ?? 1) as number,
          locked: false,
        }));
        return [
          {
            concept: {
              id: "all",
              sport,
              key: "all",
              label: "All situations",
              description: null,
            },
            mastery: situationsRung.length
              ? Math.round(situationsRung.reduce((a, b) => a + b.mastery, 0) / situationsRung.length)
              : 0,
            situations: situationsRung,
            locked: false,
            lockedByLabels: [],
            attempted: situationsRung.filter((s) => s.mastery > 0).length,
            masteredCount: situationsRung.filter((s) => s.mastery >= 85).length,
            unlockedRung: 5,
          },
        ];
      }

      const conceptById = new Map(concepts.map((c) => [c.id, c] as const));

      const conceptMastery = (id: string) => Math.round(masteryById.get(id) ?? 0);

      // Build ladder rows
      return concepts.map((c) => {
        const cSits = sitsByConcept.get(c.id) ?? [];
        const requires = c.requires_concept_ids ?? [];
        const unmet = requires.filter((rid) => conceptMastery(rid) < CONCEPT_UNLOCK_THRESHOLD);
        const lockedByLabels = unmet
          .map((rid) => conceptById.get(rid)?.label ?? "Prerequisite")
          .filter(Boolean);
        const conceptLocked = lockedByLabels.length > 0;

        // Determine unlocked rung: rung N+1 unlocks when average mastery of rung N situations >= threshold
        const byRung: Record<number, IqSituation[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        cSits.forEach((s) => {
          const r = Math.max(1, Math.min(5, (s as any).difficulty_rung ?? 1));
          byRung[r].push(s);
        });
        let unlockedRung = 1;
        for (let r = 1; r <= 4; r++) {
          const rSits = byRung[r];
          if (!rSits.length) { unlockedRung = r + 1; continue; }
          const avg =
            rSits.reduce((a, s) => a + (progressBySit.get(s.id) ?? 0), 0) / rSits.length;
          if (avg >= RUNG_UNLOCK_THRESHOLD) unlockedRung = r + 1;
          else break;
        }

        const situationsRung: LadderSituation[] = cSits
          .sort((a, b) => ((a as any).difficulty_rung ?? 1) - ((b as any).difficulty_rung ?? 1))
          .map((s) => {
            const rung = Math.max(1, Math.min(5, (s as any).difficulty_rung ?? 1));
            return {
              situation: s,
              mastery: progressBySit.get(s.id) ?? 0,
              rung,
              locked: conceptLocked || rung > unlockedRung,
            };
          });

        return {
          concept: c,
          mastery: conceptMastery(c.id),
          situations: situationsRung,
          locked: conceptLocked,
          lockedByLabels,
          attempted: situationsRung.filter((s) => s.mastery > 0).length,
          masteredCount: situationsRung.filter((s) => s.mastery >= 85).length,
          unlockedRung,
        };
      });
    },
  });
}
