import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VideoReadiness {
  video_id: string;
  owner_id: string;
  has_format: boolean;
  has_domain: boolean;
  has_description: boolean;
  assignment_count: number;
  is_ready: boolean;
  missing_fields: string[];
}

export function useVideoReadiness() {
  return useQuery({
    queryKey: ["library-videos-readiness"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("library_videos_readiness")
        .select("*");
      if (error) throw error;
      return (data || []) as VideoReadiness[];
    },
    staleTime: 30_000,
  });
}

export function readinessByVideoId(rows: VideoReadiness[] | undefined) {
  const map = new Map<string, VideoReadiness>();
  if (!rows) return map;
  for (const r of rows) map.set(r.video_id, r);
  return map;
}

export function summarizeReadiness(rows: VideoReadiness[] | undefined) {
  const total = rows?.length ?? 0;
  const ready = rows?.filter(r => r.is_ready).length ?? 0;
  const empty = rows?.filter(r => r.missing_fields.length === 4).length ?? 0;
  const incomplete = total - ready - empty;
  return { total, ready, empty, incomplete };
}

export const MISSING_LABEL: Record<string, string> = {
  video_format: "format",
  skill_domains: "skill",
  ai_description: "description",
  tag_assignments: "tags",
};
