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
import { priorityAccess } from '@/lib/hammer/priorityAccess';
import { useNavigate } from "react-router-dom";
import { getActiveTier } from "@/utils/tierAccess";
import { usePurchaseAvailability } from "@/hooks/usePurchaseAvailability";
import { goToStripe } from "@/lib/purchase/goToStripe";

type Sport = "baseball" | "softball";
const NAME: Record<Sport, string> = { baseball: "Baseball", softball: "Softball" };

/** For players who play Both: switch which sport the daily plan is built for. */
export function ActiveSportSwitch({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canShowPurchaseUI } = usePurchaseAvailability();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<{ sport: Sport; tier: string | null } | null>(null);
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
    setBusy(true); setResult(null); setPurchase(null);
    try {
      const {data:subscription,error:accessError}=await supabase.from('subscriptions').select('status,subscribed_modules').eq('user_id',userId).maybeSingle();
      if(accessError) throw accessError;
      const access=priorityAccess(subscription?.status==='active'?subscription.subscribed_modules??[]:[],next);
      if(!access.hasHitting&&!access.hasPitching&&!access.hasThrowing){
        const message=`Your plan covers ${NAME[primary]} only. Add a ${NAME[next]} plan or switch your subscription. Your sport and saved work have not changed.`;
        setPurchase({ sport: next, tier: getActiveTier(subscription?.subscribed_modules ?? [], primary) });
        setResult(message);toast.error(message);return;
      }
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

  async function managePlan() {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (!data?.url) throw new Error("Couldn't open Manage my plan. Please try again.");
      goToStripe(data.url, "portal");
    } catch {
      toast.error("Couldn't open Manage my plan. Please try again.");
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
      {purchase && canShowPurchaseUI && (
        <div className="mt-2 flex flex-col gap-2">
          <Button size="sm" className="min-h-11 whitespace-normal" disabled={busy} onClick={() => {
            if (purchase.tier) navigate("/checkout", { state: { tier: purchase.tier, sport: purchase.sport } });
            else navigate("/pricing", { state: { sport: purchase.sport } });
          }}>Add the {purchase.sport} plan</Button>
          <Button size="sm" variant="outline" className="min-h-11 whitespace-normal" disabled={busy} onClick={managePlan}>Switch my plan to {purchase.sport}</Button>
        </div>
      )}
    </div>
  );
}
