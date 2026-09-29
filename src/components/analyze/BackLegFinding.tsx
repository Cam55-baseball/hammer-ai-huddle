import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { rootPattern } from "@/lib/analysis/rootPatterns";
import { withoutMeasurementNotation } from "@/lib/reportCard/athleteLanguage";

/** A single clip's server-verified back-leg finding; never inferred from AI prose. */
export function BackLegFinding({ videoId }: { videoId: string | null }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["back-leg-finding", user?.id, videoId],
    enabled: Boolean(user && videoId),
    queryFn: async () => {
      const { data, error } = await supabase.from("analysis_fault_findings")
        .select("root_pattern_key, evidence")
        .eq("user_id", user?.id ?? "")
        .eq("video_id", videoId ?? "")
        .eq("fault_key", "hip_load_back_leg_not_balanced")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const pattern = rootPattern(data?.root_pattern_key);
  if (!pattern || !data) return null;
  return (
    <div className="border-l-2 border-primary pl-4 space-y-1" role="status">
      <h3 className="font-semibold">{pattern.label}</h3>
      <p className="text-sm text-muted-foreground">{withoutMeasurementNotation(data.evidence)}</p>
      <p className="text-sm text-muted-foreground">{withoutMeasurementNotation(pattern.why)}</p>
    </div>
  );
}