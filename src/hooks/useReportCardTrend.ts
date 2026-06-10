import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getReportCardSpec } from "@/lib/reportCard";
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
 * module. Reads canonical `ai_analysis` only — never authors organism truth.
 * Rows missing structured `metrics` surface with `grade: null` so the UI can
 * offer a recompute affordance without inventing a score.
 */
export function useReportCardTrend(module: string | null, limit = 8) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["report-card-trend", user?.id, module, limit],
    enabled: !!user?.id && !!module,
    staleTime: 60_000,
    queryFn: async (): Promise<TrendEntry[]> => {
      const { data, error } = await supabase
        .from("ai_analysis")
        .select("video_id, created_at, sport, module, metrics")
        .eq("user_id", user!.id)
        .eq("module", module!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        video_id: string;
        created_at: string;
        sport: string;
        module: string;
        metrics: Record<string, unknown> | null;
      }>;

      return rows.map((r) => {
        const spec = getReportCardSpec(r.sport, r.module);
        const hasMetrics = !!r.metrics && Object.keys(r.metrics).length > 0;
        if (!spec || !hasMetrics) {
          return {
            videoId: r.video_id,
            createdAt: r.created_at,
            module: r.module,
            sport: r.sport,
            grade: null,
            hasMetrics,
          };
        }
        const analysisLike = { metrics: r.metrics } as Parameters<typeof spec.tiles[number]["compute"]>[0];
        const tilesWithState = spec.tiles.map((t) => ({ spec: t, state: t.compute(analysisLike) }));
        return {
          videoId: r.video_id,
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
