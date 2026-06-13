import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getReportCardSpec, type AnalysisLike } from "@/lib/reportCard";
import { gradeFromTiles, type GradeResult } from "@/lib/reportCard/grade";

export interface TrendEntry {
  videoId: string;
  createdAt: string;
  module: string;
  sport: string;
  grade: GradeResult | null;
  hasMetrics: boolean;
}

/**
 * Replay-safe trend snapshot for the athlete's last N analyses for a given
 * module. Reads canonical `videos.ai_analysis` only — never authors organism
 * truth. Rows missing structured `metrics` surface with `grade: null` so the
 * UI can offer a recompute affordance without inventing a score.
 */
export function useReportCardTrend(module: string | null, limit = 8, userIdOverride?: string) {
  const { user } = useAuth();
  const targetUserId = userIdOverride ?? user?.id;
  return useQuery({
    queryKey: ["report-card-trend", targetUserId, module, limit],
    enabled: !!targetUserId && !!module,
    staleTime: 60_000,
    queryFn: async (): Promise<TrendEntry[]> => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, created_at, sport, module, ai_analysis")
        .eq("user_id", targetUserId!)
        .eq("module", module as "hitting")
        .not("ai_analysis", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        id: string;
        created_at: string;
        sport: string;
        module: string;
        ai_analysis: unknown;
      }>;

      return rows.map((r) => {
        const ai = (r.ai_analysis ?? {}) as Record<string, unknown>;
        const metrics = (ai.metrics ?? null) as Record<string, unknown> | null;
        const hasMetrics = !!metrics && Object.keys(metrics).length > 0;
        const spec = getReportCardSpec(r.sport, r.module);
        if (!spec || !hasMetrics) {
          return {
            videoId: r.id,
            createdAt: r.created_at,
            module: r.module,
            sport: r.sport,
            grade: null,
            hasMetrics,
          };
        }
        const analysisLike = { metrics } as AnalysisLike;
        const tilesWithState = spec.tiles.map((t) => ({ spec: t, state: t.compute(analysisLike) }));
        return {
          videoId: r.id,
          createdAt: r.created_at,
          module: r.module,
          sport: r.sport,
          grade: gradeFromTiles(tilesWithState),
          hasMetrics,
        };
      });
    },
  });
}
