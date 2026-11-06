import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { askParents, buyAddon, callFn } from "@/lib/addons/client";
import type { AddonProduct, PurchaseGate } from "../../../supabase/functions/_shared/addons/rules";

interface Status {
  gate: PurchaseGate;
  parentIds: string[];
  recap: { ok: boolean; message?: string };
  purchases: { product: AddonProduct; delivery_status: string }[];
  requests: { product: AddonProduct }[];
}

export interface AddOnRowProps {
  title: string;
  price: string;
  description: string;
  disabledReason?: string | null;
  actionLabel: string;
  busy?: boolean;
  onAction?: () => void;
  extra?: React.ReactNode;
}

export function AddOnRow({ title, price, description, disabledReason, actionLabel, busy, onAction, extra }: AddOnRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {title} <span className="text-muted-foreground font-normal">— {price}</span>
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {disabledReason && <p className="text-xs text-muted-foreground mt-1">{disabledReason}</p>}
        {extra}
      </div>
      <Button size="sm" className="shrink-0" disabled={!!disabledReason || busy} onClick={onAction}>
        {busy ? "…" : actionLabel}
      </Button>
    </div>
  );
}

export function AddOnsSection({ hasActivePlan }: { hasActivePlan: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<AddonProduct | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setStatus(await callFn<Status>("verify-addon-payment", { action: "status" })); } catch { setStatus(null); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  if (!user) return null;

  const run = async (product: AddonProduct) => {
    if (!status) return;
    setBusy(product);
    try {
      if (status.gate === "ask_parent") {
        await askParents(user.id, status.parentIds, product);
        toast({ title: "Sent to your parent", description: "Your parent can approve and pay from their account." });
      } else {
        const r: any = await buyAddon(product, user.id);
        if (r && !r.canceled) toast({ title: "Thanks! Your purchase went through." });
      }
      await load();
    } catch (e) {
      toast({ title: "That didn't go through", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const pending = (p: AddonProduct) => status?.requests.some((r) => r.product === p);
  const parentNote = status?.gate === "blocked_no_parent" ? "Players under 18 need a linked parent to buy. Invite a parent first." : null;
  const recapReason = !hasActivePlan ? "Needs an active plan." : parentNote ?? (status && !status.recap.ok ? status.recap.message : null) ?? (pending("early_recap") ? "Waiting for your parent." : null);
  const lessonsBought = status?.purchases.some((p) => p.product === "online_lessons");
  const recapWaiting = status?.purchases.some((p) => p.product === "early_recap" && p.delivery_status !== "delivered");
  const label = status?.gate === "ask_parent" ? "Ask parent" : "Buy";

  return (
    <section aria-label="Add-ons" className="rounded-lg border border-border bg-card px-4 py-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground pt-2">Add-ons</h2>
      <div className="divide-y divide-border">
        <AddOnRow
          title="Early 6-Week Recap" price="$100"
          description="Get your 6-week recap early, covering this block so far."
          disabledReason={status ? recapReason : "Loading…"}
          actionLabel={label} busy={busy === "early_recap"} onAction={() => run("early_recap")}
          extra={recapWaiting ? <p className="text-xs text-muted-foreground mt-1">Your early recap is paid and being made. It will show with your recaps.</p> : null}
        />
        <AddOnRow
          title="Hammers Online ×4 — Private lessons" price="$20,000"
          description="Four 1-hour one-on-one online lessons with the coach on Google Meet."
          disabledReason={status ? parentNote ?? (pending("online_lessons") ? "Waiting for your parent." : null) : "Loading…"}
          actionLabel={label} busy={busy === "online_lessons"} onAction={() => run("online_lessons")}
          extra={lessonsBought ? <Link to="/lessons" className="text-xs text-primary underline mt-1 inline-block">See or pick your lesson times</Link> : null}
        />
      </div>
      <p className="text-xs text-muted-foreground pb-2">Questions about your lessons? <a className="underline" href="mailto:hammersmodality@hammersmodality.org">Contact us</a></p>
    </section>
  );
}
