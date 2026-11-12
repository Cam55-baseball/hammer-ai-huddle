import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Sparkles, Video, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BRAND_GRADIENT, BRAND_TEXT_SHADOW } from "@/components/dashboard/brandGradient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { askParents, buyAddon, callFn } from "@/lib/addons/client";
import { cancelledLine, failureLine, opensLabel } from "@/lib/addons/messages";
import type { AddonProduct, PurchaseGate } from "../../../supabase/functions/_shared/addons/rules";

interface Status {
  gate: PurchaseGate;
  parentIds: string[];
  recap: { ok: boolean; message?: string; reason?: string; opensAt?: string | null };
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
  icon?: LucideIcon;
  /** Build 13: the status couldn't load — the button becomes "Try again". */
  onRetry?: () => void;
  /** Build 13: one plain line after a purchase attempt (cancelled / failed). */
  notice?: { text: string; tone: "neutral" | "error" } | null;
}

// Owner Nov 7: each add-on is a colorful card matching the plan squares before purchase
// (icon, title, one-line description, price, gradient Buy/state button). Behavior unchanged.
export function AddOnRow({ title, price, description, disabledReason, actionLabel, busy, onAction, extra, icon: AddOnIcon = Sparkles, onRetry, notice }: AddOnRowProps) {
  const disabled = onRetry ? !!busy : !!disabledReason || busy;
  return (
    <Card
      className="p-4 sm:p-6 border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/10 via-card to-primary/5"
      data-addon-card={title}
    >
      <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
        <div className="p-3 rounded-full bg-primary/10">
          <AddOnIcon className="h-7 w-7 sm:h-10 sm:w-10 text-primary" aria-hidden />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Badge className="bg-primary text-primary-foreground text-sm px-3 py-0.5">{price}</Badge>
        {/* Owner Nov 12: every lock reason in normal, readable text. */}
        {disabledReason && <p className="text-sm text-foreground" data-addon-reason>{disabledReason}</p>}
        <Button
          className={`w-full h-12 font-bold uppercase tracking-wide text-primary-foreground border-0 ${BRAND_GRADIENT}
                      shadow-[0_0_24px_hsl(var(--primary)/0.45)] transition-[transform,box-shadow] active:scale-[0.98]
                      hover:shadow-[0_0_36px_hsl(var(--primary)/0.65)] disabled:shadow-none ${BRAND_TEXT_SHADOW}`}
          disabled={disabled}
          onClick={onRetry ?? onAction}
        >
          {busy ? "…" : onRetry ? "Try again" : actionLabel}
        </Button>
        {notice && (
          <p role="status" data-addon-notice className={`text-sm ${notice.tone === "error" ? "text-destructive" : "text-foreground"}`}>{notice.text}</p>
        )}
        {extra}
      </div>
    </Card>
  );
}

const STATUS_TIMEOUT_MS = 15_000;

export function AddOnsSection({ hasActivePlan }: { hasActivePlan: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<AddonProduct | null>(null);
  const [notice, setNotice] = useState<{ product: AddonProduct; text: string; tone: "neutral" | "error" } | null>(null);

  // Owner Nov 12: a status that can't load says so and offers "Try again" (never "Loading…" forever).
  const load = useCallback(async () => {
    if (!user) return;
    setLoadFailed(false);
    try {
      const next = await Promise.race([
        callFn<Status>("verify-addon-payment", { action: "status" }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), STATUS_TIMEOUT_MS)),
      ]);
      setStatus(next);
    } catch {
      setStatus(null);
      setLoadFailed(true);
    }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  if (!user) return null;

  const run = async (product: AddonProduct) => {
    if (!status) return;
    setBusy(product);
    setNotice(null);
    try {
      if (status.gate === "ask_parent") {
        await askParents(user.id, status.parentIds, product);
        toast({ title: "Sent to your parent", description: "Your parent can approve and pay from their account." });
      } else {
        const r: any = await buyAddon(product, user.id);
        // Owner Nov 12: cancelling is never a red error — one neutral line.
        if (r?.canceled) setNotice({ product, text: cancelledLine(product), tone: "neutral" });
        else if (r) toast({ title: "Thanks! Your purchase went through." });
      }
      await load();
    } catch (e) {
      const text = failureLine(e);
      setNotice({ product, text, tone: (e as any)?.afterPayment ? "neutral" : "error" });
      if ((e as any)?.afterPayment) void load();
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
  // Owner Nov 12: a recap locked for the first 14 days shows its opening date on the button itself.
  const recapOpens = status && !status.recap.ok && status.recap.reason === "too_early" ? opensLabel(status.recap.opensAt) : null;
  const loadingReason = loadFailed ? "We couldn't check your add-ons right now." : "Loading…";
  const noticeFor = (p: AddonProduct) => (notice?.product === p ? notice : null);

  return (
    <section aria-label="Add-ons" className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">Add-ons</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <AddOnRow
          icon={CalendarClock}
          title="Early 6-Week Recap" price="$100"
          description="Get your 6-week recap early, covering this block so far."
          disabledReason={status ? recapReason : loadingReason}
          actionLabel={recapOpens && recapReason === status?.recap.message ? recapOpens : label}
          busy={busy === "early_recap"} onAction={() => run("early_recap")}
          onRetry={loadFailed ? () => void load() : undefined} notice={noticeFor("early_recap")}
          extra={recapWaiting ? <p className="text-xs text-muted-foreground mt-1">Your early recap is paid and being made. It will show with your recaps.</p> : null}
        />
        <AddOnRow
          icon={Video}
          title="Hammers Online ×4 — Private lessons" price="$20,000"
          description="Four 1-hour one-on-one online lessons with the coach on Google Meet."
          disabledReason={status ? parentNote ?? (pending("online_lessons") ? "Waiting for your parent." : null) : loadingReason}
          actionLabel={label} busy={busy === "online_lessons"} onAction={() => run("online_lessons")}
          onRetry={loadFailed ? () => void load() : undefined} notice={noticeFor("online_lessons")}
          extra={lessonsBought ? <Link to="/lessons" className="text-xs text-primary underline mt-1 inline-block">See or pick your lesson times</Link> : null}
        />
      </div>
      <p className="text-xs text-muted-foreground">Questions about your lessons? <a className="underline" href="mailto:hammersmodality@hammersmodality.org">Contact us</a></p>
    </section>
  );
}
