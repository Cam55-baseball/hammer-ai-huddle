/**
 * Landing page Stripe opens (in Safari) after a checkout started from the
 * native app. Safari can't open the app's internal address, so this page tells
 * the buyer to switch back — the app confirms the purchase on resume.
 * Public: no sign-in needed, grants nothing.
 */
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

export default function PurchaseComplete() {
  const [params] = useSearchParams();
  const cancelled = params.get("status") === "cancel";
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 pt-safe pb-safe">
      <div className="max-w-sm text-center space-y-4">
        {cancelled ? (
          <>
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">Checkout cancelled</h1>
            <p className="text-muted-foreground">You weren't charged. You can close this page and return to the Hammers Modality app.</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Payment received</h1>
            <p className="text-muted-foreground">
              Return to the Hammers Modality app — it will confirm your purchase and open your dashboard.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
