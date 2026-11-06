import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buyAddon } from "@/lib/addons/client";

const NAMES: Record<string, string> = { early_recap: "Early 6-Week Recap — $100", online_lessons: "Hammers Online ×4 — Private lessons — $20,000" };

export function ParentAddOnRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("addon_parent_requests").select("id, athlete_user_id, product, status, created_at").eq("parent_user_id", user.id).eq("status", "pending");
    setRows(data ?? []);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  if (!user || rows.length === 0) return null;

  const decline = async (id: string) => {
    await supabase.from("addon_parent_requests").update({ status: "declined" }).eq("id", id);
    await load();
  };
  const pay = async (r: any) => {
    try {
      const res: any = await buyAddon(r.product, user.id, r.athlete_user_id);
      if (res && !res.canceled) toast({ title: "Paid. Thank you!" });
      await load();
    } catch (e) {
      toast({ title: "That didn't go through", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <section aria-label="Add-on requests" className="rounded-lg border border-border bg-card p-4 space-y-2">
      <h2 className="text-sm font-bold text-foreground">Your player asked for</h2>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-foreground">{NAMES[r.product]}</span>
          <span className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => pay(r)}>Approve &amp; pay</Button>
            <Button size="sm" variant="outline" onClick={() => decline(r.id)}>No thanks</Button>
          </span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">You'll be copied on every lesson invite.</p>
    </section>
  );
}
