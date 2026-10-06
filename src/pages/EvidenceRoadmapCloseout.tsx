/** DEV-only: real saved evidence, no generation, no writes during capture. */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DayNoticesCard } from "@/components/hammer/DayNoticesCard";
import { RankGoalsPromptCard } from "@/components/hammer/RankGoalsPromptCard";

export default function EvidenceRoadmapCloseout() {
  const { user } = useAuth();
  const date = new URLSearchParams(location.search).get("date") ?? "2026-09-09";
  const q = useQuery({
    queryKey: ["closeout-saved-notices", user?.id, date], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("wk_prescriptions" as any)
        .select("why_payload").eq("user_id", user!.id).eq("plan_date", date);
      if (error) throw error;
      const notices = (data ?? []).flatMap((r: any) => r.why_payload?.reductions ?? [])
        .filter((n: any) => n.reason === "recent_load");
      return [...new Map(notices.map((n: any) => [n.detail, n])).values()] as { reason: string; detail: string }[];
    },
  });
  return <main className="mx-auto w-[390px] max-w-full space-y-4 p-3">
    <h1 className="text-sm font-semibold">Saved Stage 4 notice · {date}</h1>
    {q.isError ? <p>Couldn't read the saved notice.</p> : q.isLoading ? <p>Loading saved notice…</p>
      : q.data?.length ? <section data-testid="stage4-saved-card"><DayNoticesCard notices={q.data} planDate={date} /></section>
      : <p>No recent-load notice saved for this day.</p>}
    <RankGoalsPromptCard />
  </main>;
}