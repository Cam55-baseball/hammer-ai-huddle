/** "Your progression" lives in The General (moved off activity cards by owner). Read-only. */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WkProgressionBadge, WkProgressionNote, type ProgressionPayloadShape } from "@/components/hammer/WkProgressionNote";

export function YourProgressionCard() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-CA");
  const { data } = useQuery({
    queryKey: ["general-progression", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("wk_prescriptions" as any)
        .select("id, movement_name, why_payload").eq("user_id", user!.id).eq("plan_date", today);
      return ((data ?? []) as any[]).filter((r) => r?.why_payload?.progression || r?.why_payload?.bat_speed_stage_label);
    },
  });
  if (!data?.length) return null;
  return (
    <Card data-your-progression>
      <CardHeader className="pb-2"><CardTitle className="text-base">Your progression</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-xs">
        {data.map((r) => (
          <div key={r.id} className="space-y-1 border-l-2 border-border pl-3">
            <p className="text-sm font-semibold text-foreground"><span className="text-muted-foreground font-normal">Activity: </span>{r.movement_name}</p>
            <WkProgressionBadge progression={r.why_payload.progression as ProgressionPayloadShape} stageLabel={r.why_payload.bat_speed_stage_label ?? null} />
            <WkProgressionNote progression={r.why_payload.progression as ProgressionPayloadShape} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
