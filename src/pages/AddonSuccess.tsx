import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { callFn } from "@/lib/addons/client";
import { failureLine } from "@/lib/addons/messages";

export default function AddonSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"checking" | "lessons" | "recap" | "error">("checking");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) { setState("error"); setMsg("No payment found."); return; }
    callFn<{ product: string }>("verify-addon-payment", { action: "confirm", sessionId })
      .then((r) => setState(r.product === "online_lessons" ? "lessons" : "recap"))
      // Owner Nov 12: plain words, no raw codes. Stripe also records the payment directly (stripe-webhook).
      .catch((e) => { (e as any).afterPayment = true; setState("error"); setMsg(failureLine(e)); });
  }, [params]);
  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto p-6 space-y-3 text-center">
        {state === "checking" && <p className="text-sm text-muted-foreground">Checking your payment…</p>}
        {state === "recap" && <><h1 className="text-lg font-bold text-foreground">Thanks!</h1><p className="text-sm text-muted-foreground">Your Early 6-Week Recap is paid. It will show with your recaps.</p><Link className="text-primary underline text-sm" to="/dashboard">Back to Dashboard</Link></>}
        {state === "lessons" && <><h1 className="text-lg font-bold text-foreground">Thanks!</h1><p className="text-sm text-muted-foreground">Next, pick your 4 lesson times.</p><Link className="text-primary underline text-sm" to="/lessons">Pick my times</Link></>}
        {state === "error" && <><p className="text-sm text-foreground">{msg}</p><p className="text-xs text-muted-foreground">Questions? <a className="underline" href="mailto:hammersmodality@hammersmodality.org">Contact us</a></p></>}
      </div>
    </DashboardLayout>
  );
}
