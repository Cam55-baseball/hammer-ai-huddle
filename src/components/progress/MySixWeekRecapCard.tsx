import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const NM = "Not yet measured";
const d = (x?: string | null) => (x ? String(x).slice(0, 10) : "date not recorded");

/** The General — player layer: the player's own latest six-week recap. */
export function MySixWeekRecapCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-six-week-recap"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("vault_recaps")
        .select("recap_period_start, recap_period_end, strength_change_percent, total_weight_lifted")
        .eq("user_id", u.user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <Card className="border-primary/20 p-4 space-y-1" data-testid="my-six-week-recap">
      <p className="font-semibold">Your six-week recap</p>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : !data ? <p className="text-sm text-muted-foreground">No six-week recap yet. Your first one arrives after six weeks of training.</p>
        : <>
            <p className="text-sm">Period: {d(data.recap_period_start)} to {d(data.recap_period_end)}</p>
            <p className="text-sm">Strength change: {data.strength_change_percent != null ? `${data.strength_change_percent}%` : NM}</p>
            <p className="text-sm">Total weight lifted: {data.total_weight_lifted ? `${data.total_weight_lifted} lb` : NM}</p>
            <p className="text-xs text-muted-foreground">Source: your logged workouts</p>
          </>}
    </Card>
  );
}
