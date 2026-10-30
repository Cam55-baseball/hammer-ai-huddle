import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { dispatchSportChange } from "@/contexts/SportThemeContext";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import { rebuildAfterChange } from "@/lib/hammer/rebuildAfterChange";
import { getTodayDate } from "@/utils/dateUtils";

type Sport = "baseball" | "softball";
const NAME: Record<Sport, string> = { baseball: "Baseball", softball: "Softball" };

/** For players who play Both: switch which sport the daily plan is built for. */
export function ActiveSportSwitch({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const ctx = useQuery({
    queryKey: ["active-sport", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("athlete_context").select("sport_primary, sport_secondary").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as { sport_primary: string | null; sport_secondary: string[] | null } | null;
    },
  });
  const primary = ctx.data?.sport_primary === "softball" ? "softball" : ctx.data?.sport_primary === "baseball" ? "baseball" : null;
  const secondary = (ctx.data?.sport_secondary ?? []).filter((s): s is Sport => s === "baseball" || s === "softball");
  if (!primary || !secondary.some((s) => s !== primary)) return null;

  async function choose(next: Sport) {
    if (busy || !primary || next === primary) return;
    setBusy(true); setResult(null);
    try {
      await persistContextAnswer(userId, "sport_primary", next, "tell_hammer", "self_report");
      await persistContextAnswer(userId, "sport_secondary", [primary], "tell_hammer", "self_report");
      dispatchSportChange(next);
      const r = await rebuildAfterChange(`Active sport: ${NAME[next]}`, getTodayDate());
      setResult(r.message);
      (r.ok ? toast.success : toast.error)(r.message);
      await qc.invalidateQueries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't switch your sport.";
      setResult(`Couldn't switch your sport. ${msg}`);
      toast.error("Couldn't switch your sport.");
    } finally { setBusy(false); }
  }

  return (
    <div data-active-sport-switch>
      <Label className="text-xs">You play both — which sport is your plan for?</Label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {(["baseball", "softball"] as Sport[]).map((s) => (
          <Button key={s} size="sm" className="min-h-11" variant={s === primary ? "default" : "outline"} disabled={busy} aria-pressed={s === primary} onClick={() => choose(s)}>
            {NAME[s]}{s === primary ? " (active)" : ""}
          </Button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{busy ? "Rebuilding your next 7 days…" : result ?? "Switching rebuilds your next 7 days for that sport only."}</p>
    </div>
  );
}
