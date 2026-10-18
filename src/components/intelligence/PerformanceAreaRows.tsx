import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { buildAreaRows, type AreaVideo } from "@/lib/intelligence/areaRows";
import { isEarlyRead } from "@/lib/intelligence/howSure";

export function PerformanceAreaRows() {
  const { user } = useAuth();
  const { data: rows = [] } = useQuery({
    queryKey: ["perf-area-rows", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos")
        .select("module, efficiency_score, created_at").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return buildAreaRows((data ?? []) as AreaVideo[]);
    },
  });
  if (!rows.length) return null;
  return (
    <section className="space-y-2" aria-label="Your areas">
      <h3 className="text-sm font-semibold">Your areas</h3>
      {rows.map((r) => {
        const Icon = r.trend === "up" ? ArrowUp : r.trend === "down" ? ArrowDown : ArrowRight;
        return (
          <Card key={r.area} className="flex items-center justify-between p-3">
            <div>
              <p className="font-semibold">{r.area}</p>
              <p className="text-xs text-muted-foreground">
                {r.count} {r.count === 1 ? "analysis" : "analyses"}{isEarlyRead(r.count) ? " · early read" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Latest analysis score</p>
              <p className="text-2xl font-bold tabular-nums">
                {r.latest ?? "Not measured"}{r.latest != null && <span className="text-xs font-normal"> / 100</span>}
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Icon className="h-3 w-3" />{r.trend ? `Trend: ${r.trend === "up" ? "going up" : r.trend === "down" ? "going down" : "same"}` : "Trend: need more data"}
              </p>
            </div>
          </Card>
        );
      })}
      <Link to="/vault" className="text-xs text-primary underline">See tests</Link>
    </section>
  );
}
