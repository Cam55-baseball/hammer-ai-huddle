import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HammersCard } from "@/components/intelligence/HammersCard";

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

  if (isLoading) return null;
  const lifted = data?.total_weight_lifted ? Number(data.total_weight_lifted) : 0;
  const measured = !!data && lifted > 0 && data.strength_change_percent != null;
  const change = Number(data?.strength_change_percent ?? 0);
  return (
    <div data-testid="my-six-week-recap">
      <HammersCard title="Your six-week strength recap"
        weSee={measured ? `Strength ${change > 0 ? "up" : change < 0 ? "down" : "about the same"} ${Math.abs(change)}% (${d(data!.recap_period_start)} to ${d(data!.recap_period_end)}), ${lifted} lb lifted.` : "Not enough logged lifting to show a strength change yet."}
        because={measured ? "From the weights you logged in your lifts." : undefined}
        howSure={measured ? "measured" : "need_more_data"}
        doThis={measured ? (change < 0 ? "Check your sleep and soreness, and log every lift set with its weight." : "Keep logging every lift set with its weight.") : "Log the weight on every lift set."}
        checkBack="At your next six-week recap." />
    </div>
  );
}
