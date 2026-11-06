import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { callFn } from "@/lib/addons/client";

export default function AddonSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"checking" | "lessons" | "recap" | "error">("checking");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) { setState("error"); setMsg("No payment found."); return; }
    callFn<{ product: string }>("verify-addon-payment", { action: "confirm", sessionId })
      .then((r) => setState(r.product === "online_lessons" ? "lessons" : "recap"))
      .catch((e) => { setState("error"); setMsg(e instanceof Error ? e.message : ""); });
  }, [params]);
  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto p-6 space-y-3 text-center">
        {state === "checking" && <p className="text-sm text-muted-foreground">Checking your payment…</p>}
        {state === "recap" && <><h1 className="text-lg font-bold text-foreground">Thanks!</h1><p className="text-sm text-muted-foreground">Your Early 6-Week Recap is paid. It will show with your recaps.</p><Link className="text-primary underline text-sm" to="/dashboard">Back to Dashboard</Link></>}
        {state === "lessons" && <><h1 className="text-lg font-bold text-foreground">Thanks!</h1><p className="text-sm text-muted-foreground">Next, pick your 4 lesson times.</p><Link className="text-primary underline text-sm" to="/lessons">Pick my times</Link></>}
        {state === "error" && <><p className="text-sm text-foreground">We couldn't confirm that payment yet.</p><p className="text-xs text-muted-foreground">{msg}</p><p className="text-xs text-muted-foreground">Questions? <a className="underline" href="mailto:hammersmodality@hammersmodality.org">Contact us</a></p></>}
      </div>
    </DashboardLayout>
  );
}
