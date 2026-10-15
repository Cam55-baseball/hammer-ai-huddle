import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePurchaseAvailability } from "@/hooks/usePurchaseAvailability";
import { openWebsiteCheckout } from "@/lib/purchase/websiteHandoff";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAFF_PLAN_COPY } from "@/lib/staffPlans";
import { Checkbox } from "@/components/ui/checkbox";
import { recordConsent } from "@/lib/legal/legalV2";
import { NumberStepper } from "@/components/ui/number-stepper";
import { LegalDocLink } from "@/components/legal/LegalDocLink";
import { goToStripe, reportCheckoutError } from "@/lib/purchase/goToStripe";
import { BackButton } from "@/components/common/BackButton";
import { SignedInAs } from "@/components/purchase/SignedInAs";

/** Terms version that holds the coach/org fair-use section (lawyer-approved 2026-10-13). */
const FAIR_USE_TERMS_VERSION = 2;

type Status = { plan: "coach" | "organization" | null; status: string; extra_seats: number; included_seats: number };

export default function StaffPlans() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { canShowPurchaseUI, mode } = usePurchaseAvailability();
  const [status, setStatus] = useState<Status | null>(null);
  const [seats, setSeats] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [fairUse, setFairUse] = useState(false);
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false);
  const navigate = useNavigate();

  const [result, setResult] = useState<string | null>(null);
  const dashboardFor = (p: Status["plan"]) => (p === "organization" ? "/organization" : p === "coach" ? "/coach-dashboard" : null);

  /** Reads the plan from Stripe. `show` = the person tapped a button, so always show an answer. */
  async function refresh(portal = false, show = false): Promise<Status | null> {
    if (!user) { if (show) reportCheckoutError("staff-plan", "Please sign in first."); return null; }
    if (show) { setBusy(portal ? "portal" : "check"); setMsg(null); setResult(null); }
    const { data, error } = await supabase.functions.invoke("sync-staff-plan", { body: { portal } });
    let reason: string | undefined = data?.error;
    if (error && !reason) { try { reason = (await (error as any).context?.json?.())?.error; } catch { /* generic */ } }
    if (show) setBusy(null);
    if (error || reason) {
      const m = reason ?? "Could not check your plan. Please try again.";
      if (show) { setMsg(m); reportCheckoutError("staff-plan", m); }
      return null;
    }
    setStatus(data);
    if (show && !portal) {
      setResult(data.plan
        ? `${STAFF_PLAN_COPY[data.plan as "coach" | "organization"].name} — active${data.plan === "organization" ? `, ${data.included_seats + data.extra_seats} coach seats (${data.included_seats} included + ${data.extra_seats} extra)` : ""}`
        : `No active Coach or Organization plan for this account (status: ${data.status}).`);
    }
    if (portal) {
      if (data.portal) goToStripe(data.portal, "staff-portal");
      else { const m = "No billing account was found for this email yet. Buy a plan first, or sign in with the email you paid with."; setMsg(m); reportCheckoutError("staff-portal", m); }
    }
    return data;
  }
  useEffect(() => {
    if (!user) return;
    // Back from Stripe after paying: wait for the plan to turn on, then open the right dashboard.
    if (params.get("status") === "success") {
      let tries = 0, stop = false;
      const tick = async () => {
        const s = await refresh();
        const to = dashboardFor(s?.plan ?? null);
        if (to && !stop) { navigate(to, { replace: true }); return; }
        if (++tries < 6 && !stop) setTimeout(tick, 2500);
      };
      tick();
      return () => { stop = true; };
    }
    refresh();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user?.id]);
  const [orgPending, setOrgPending] = useState(false);
  useEffect(() => {
    if (!user) return;
    (supabase as any).from("organizations").select("verification_status,is_solo").eq("owner_user_id", user.id)
      .then(({ data }: any) => setOrgPending((data ?? []).some((o: any) => !o.is_solo && o.verification_status !== "verified")));
  }, [user?.id]);

  async function buy(plan: "coach" | "organization") {
    if (mode === "native-linkout") { await openWebsiteCheckout("/staff-plans"); return; }
    if (!fairUse) { setMsg("Tick the box above to accept the fair-use terms, then tap again."); reportCheckoutError("staff", "Tick the fair-use box above first, then tap the plan again."); return; }
    setBusy(plan); setMsg(null);
    try {
      await recordConsent({ slug: "terms", version: FAIR_USE_TERMS_VERSION, choice: "accepted", method: "checkout_checkbox", details: { section: "coach_org_fair_use", plan } });
    } catch { setBusy(null); setMsg("Could not save your acceptance. Try again."); return; }
    const { data, error } = await supabase.functions.invoke("create-staff-checkout", { body: { plan, extra_seats: plan === "organization" ? seats : 0 } });
    // A failed call returns the reason in the response body; read it so the person sees why.
    let reason: string | undefined = data?.error;
    let code: string | undefined = data?.code;
    if (error && !reason) { try { const b = await (error as any).context?.json?.(); reason = b?.error; code = b?.code; } catch { /* keep generic */ } }
    if (code === "not_org_admin") { setBusy(null); setNeedsOrgSetup(true); setMsg("First set up your organization, then come back here to subscribe."); return; }
    if (error || reason) { setBusy(null); setMsg(reason ?? "Checkout could not start."); reportCheckoutError("staff", reason ?? "Checkout could not start. Please try again."); return; }
    // Same tab: phones block new windows opened after a wait, which silently skipped Stripe.
    if (data?.url) { goToStripe(data.url, "staff"); setTimeout(() => setBusy(null), 4000); }
    else { setBusy(null); setMsg("Checkout could not start."); reportCheckoutError("staff", "Checkout could not start. Please try again."); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <BackButton />
      <h1 className="text-2xl font-bold">Coach and Organization plans</h1>
      <SignedInAs />
      {params.get("status") === "success" && <p className="text-sm" role="status">Thanks! Your plan turns on as soon as payment finishes. Tap "Check my plan" if it isn't on yet.</p>}
      {status?.plan && (
        <Card className="p-4 space-y-2 border-primary">
          <Badge>Your plan</Badge>
          <p className="text-sm">Plan: {STAFF_PLAN_COPY[status.plan].name}{status.plan === "organization" ? ` · Coach seats: ${status.included_seats} included + ${status.extra_seats} extra` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" disabled={!!busy} onClick={() => refresh(true, true)}>{busy === "portal" ? "Opening…" : "Manage my plan"}</Button>
            {dashboardFor(status.plan) && <Button className="min-h-11" onClick={() => navigate(dashboardFor(status.plan)!)}>{status.plan === "organization" ? "Open Organization dashboard" : "Open Coach Dashboard"}</Button>}
          </div>
        </Card>
      )}
      {canShowPurchaseUI && mode === "web" && !status?.plan && (
        <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
          <Checkbox checked={fairUse} onCheckedChange={(v) => setFairUse(v === true)} aria-label="Accept fair use terms" />
          <span>I accept the <LegalDocLink slug="terms" className="underline">Terms</LegalDocLink>, including section 15, fair use: one named person per account or seat, no shared logins, use only for players I coach, no reselling, and up to 30 analyses per hour.</span>
        </label>
      )}
      {(["coach", "organization"] as const).map((p) => (
        <Card key={p} className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">{STAFF_PLAN_COPY[p].name}</h2>
          {canShowPurchaseUI && <p className="text-sm">Price: {STAFF_PLAN_COPY[p].price}</p>}
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {STAFF_PLAN_COPY[p].includes.map((i) => <li key={i}>{i}</li>)}
          </ul>
          {p === "organization" && orgPending && (
            <p className="text-sm rounded-md bg-muted p-2" role="note">You can set up staff and teams now; athletes can be added once your organization is verified.</p>
          )}
          {p === "organization" && mode === "web" && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Extra coach seats ($150/month each):</span>
              <NumberStepper label="extra coach seats" value={seats} onChange={setSeats} min={0} max={100} />
            </div>
          )}
          {canShowPurchaseUI && !status?.plan && (
            <Button className="w-full min-h-11" disabled={!!busy || !user} onClick={() => buy(p)}>
              {mode === "native-linkout" ? "Subscribe on our website" : busy === p ? "Opening…" : `Choose ${STAFF_PLAN_COPY[p].name}`}
            </Button>
          )}
        </Card>
      ))}
      <Button variant="outline" className="w-full min-h-11" disabled={!!busy} onClick={() => refresh(false, true)}>{busy === "check" ? "Checking…" : "Check my plan"}</Button>
      {result && (
        <Card className="p-3 space-y-2" role="status">
          <p className="text-sm font-medium">Your plan: {result}</p>
          {dashboardFor(status?.plan ?? null) && <Button className="w-full min-h-11" onClick={() => navigate(dashboardFor(status!.plan)!)}>{status!.plan === "organization" ? "Open Organization dashboard" : "Open Coach Dashboard"}</Button>}
        </Card>
      )}
      {msg && <p className="text-sm text-destructive" role="alert">{msg}</p>}
      {needsOrgSetup && <Button className="w-full min-h-11" onClick={() => navigate("/organization/setup")}>Set up your organization</Button>}
    </div>
  );
}
