import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
        .select("module, created_at").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return buildAreaRows((data ?? []) as AreaVideo[]);
    },
  });
  if (!rows.length) return null;
  return (
    <section className="space-y-2" aria-label="Your areas">
      <h3 className="text-sm font-semibold">Your areas</h3>
      {rows.map((r) => (
        <Card key={r.area} className="flex items-center justify-between p-3">
          <div>
            <p className="font-semibold">{r.area}</p>
            <p className="text-xs text-muted-foreground">
              Analyses: {r.count}{isEarlyRead(r.count) ? " · early read" : ""}
            </p>
          </div>
          <Link to="/analyze" className="text-xs text-primary underline">See report card</Link>
        </Card>
      ))}
      <Link to="/vault" className="text-xs text-primary underline">See tests</Link>
    </section>
  );
}
