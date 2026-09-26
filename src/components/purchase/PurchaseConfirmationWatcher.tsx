/**
 * Confirms a purchase when the buyer comes back from Stripe.
 *
 * A Capacitor app returning from Safari RESUMES — nothing remounts — so this
 * listens for visibility/focus as well as mount. While Stripe says "paid" but
 * the webhook-written entitlement isn't visible yet, the buyer sees a
 * "Confirming your purchase" screen, never a paywall. If it still hasn't
 * appeared after the window, they are told honestly that the payment went
 * through and support has been notified (logged server-side).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  clearPendingPurchase,
  getPendingPurchase,
  tierIsUnlocked,
} from "@/lib/purchase/pendingPurchase";

const POLL_MS = 3000;
const WINDOW_MS = 90_000;

// "returned": buyer is back from Stripe — big "Purchase Completed? Go to dashboard!" screen.
// The button only navigates; access comes solely from the webhook-written subscription.
type Phase = "idle" | "returned" | "confirming" | "delayed";

export function PurchaseConfirmationWatcher() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = useRef(false);
  const confirmStart = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reported = useRef(false);
  const wantsDashboard = useRef(false);
  const unlocked = useRef(false);

  const goDashboard = useCallback(() => {
    clearPendingPurchase();
    confirmStart.current = null;
    wantsDashboard.current = false;
    unlocked.current = false;
    setPhase("idle");
    window.dispatchEvent(new Event("hammers:subscription-refresh"));
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  const check = useCallback(async () => {
    if (busy.current) return;
    const p = getPendingPurchase();
    if (!p) { setPhase("idle"); return; }
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return;
    busy.current = true;
    try {
      let paid = false;
      let modules: string[] = [];
      let expired = false;
      if (p.sessionId) {
        const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
          body: { session_id: p.sessionId },
        });
        if (!error && data) {
          paid = !!data.paid;
          modules = data.modules ?? [];
          expired = data.status === "expired";
        }
      } else {
        const { data } = await supabase
          .from("subscriptions")
          .select("status, subscribed_modules")
          .eq("user_id", s.session.user.id)
          .maybeSingle();
        modules = data?.status === "active" ? data.subscribed_modules ?? [] : [];
      }

      if (tierIsUnlocked(modules, p.tier, p.sport)) {
        unlocked.current = true;
        // Warm the subscription state so the side menu is ready on arrival.
        window.dispatchEvent(new Event("hammers:subscription-refresh"));
        if (wantsDashboard.current) {
          toast({ title: "Purchase confirmed", description: "Your plan is unlocked." });
          goDashboard();
        } else {
          setPhase("returned");
        }
        return;
      }
      if (expired) { clearPendingPurchase(); setPhase("idle"); return; }
      if (!paid) { setPhase("idle"); return; } // still in checkout or abandoned — no overlay

      // Paid, entitlement not visible yet. Show the return screen unless the
      // buyer already tapped the button (then show confirming).
      if (confirmStart.current == null) confirmStart.current = Date.now();
      if (Date.now() - confirmStart.current < WINDOW_MS) {
        setPhase(wantsDashboard.current ? "confirming" : "returned");
        timer.current = setTimeout(() => { void check(); }, POLL_MS);
      } else {
        setPhase("delayed");
        if (!reported.current && p.sessionId) {
          reported.current = true;
          await supabase.functions.invoke("verify-checkout-session", {
            body: { session_id: p.sessionId, report_missing: true },
          });
        }
        // Keep checking slowly so it clears itself the moment the webhook lands.
        timer.current = setTimeout(() => { void check(); }, 15_000);
      }
    } finally {
      busy.current = false;
    }
  }, [goDashboard]);

  const onGoDashboard = () => {
    if (unlocked.current) {
      goDashboard();
      return;
    }
    wantsDashboard.current = true;
    setPhase("confirming");
    if (timer.current) clearTimeout(timer.current);
    void check();
  };

  useEffect(() => {
    const kick = () => {
      if (document.visibilityState !== "visible") return;
      if (timer.current) clearTimeout(timer.current);
      void check();
    };
    kick();
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("focus", kick);
    window.addEventListener("pageshow", kick);
    window.addEventListener("hammers:pending-purchase", kick);
    const { data: auth } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") kick(); });
    return () => {
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("focus", kick);
      window.removeEventListener("pageshow", kick);
      window.removeEventListener("hammers:pending-purchase", kick);
      auth.subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);

  if (phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-sm p-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(1.5rem+var(--safe-bottom))]">
      <div className="max-w-sm w-full text-center space-y-4" role="status" aria-live="polite">
        {phase === "returned" ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Finished paying on Stripe? Your new module will be waiting in the side menu.
            </p>
            <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={onGoDashboard}>
              Purchase Completed? Go to dashboard!
            </Button>
          </>
        ) : phase === "confirming" ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Confirming your purchase…</h2>
            <p className="text-sm text-muted-foreground">
              Your payment went through. We're unlocking your plan — this usually takes a few seconds.
              You'll go to your dashboard automatically.
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Your payment succeeded</h2>
            <p className="text-sm text-muted-foreground">
              Unlocking your plan is taking longer than it should. Support has been notified and will
              make sure you get access — you won't be charged again. This screen will clear on its own
              once it's done.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => { void check(); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Check again
              </Button>
              <Button variant="outline" onClick={() => { setPhase("idle"); navigate("/support"); }}>
                Contact support
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
