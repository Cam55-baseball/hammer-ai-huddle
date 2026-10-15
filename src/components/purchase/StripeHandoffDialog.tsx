import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { STRIPE_HANDOFF_EVENT } from "@/lib/purchase/goToStripe";

/** App-wide: shows "Continue to secure checkout" or a clear checkout error. */
export function StripeHandoffDialog() {
  const [state, setState] = useState<{ url: string | null; error?: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setState((e as CustomEvent).detail);
    window.addEventListener(STRIPE_HANDOFF_EVENT, on);
    return () => window.removeEventListener(STRIPE_HANDOFF_EVENT, on);
  }, []);
  const portal = !!state?.url && state.url.startsWith("https://billing.stripe.com/");
  const label = portal ? "Continue to billing portal" : "Continue to secure checkout";
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && setState(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state?.url ? label : "Something went wrong"}</DialogTitle>
          <DialogDescription>
            {state?.url ? (portal ? "Your billing page" : "Payment") + " opens on Stripe's secure page in a new tab. Come back here when you're done." : state?.error}
          </DialogDescription>
        </DialogHeader>
        {state?.url ? (
          <Button asChild className="min-h-11 w-full gap-2">
            <a href={state.url} target="_blank" rel="noopener" onClick={() => setTimeout(() => setState(null), 300)}>
              <Lock className="h-4 w-4" />{label}
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="min-h-11 w-full" onClick={() => setState(null)}>Close</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
