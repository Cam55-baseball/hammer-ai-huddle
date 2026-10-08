/**
 * legal_v2 — locks the training plan (physical training) for 13–17 players until a parent signs.
 * New teens: locked at once. Existing teens: 14-day grace banner, then locked.
 * Switch OFF, adults, under-13s, errors → children render untouched.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callTeenWaiver, TEEN_WAIVER_ERRORS, useTeenWaiver, type TeenWaiverState } from "@/lib/legal/teenWaiver";

export function TeenWaiverGate({ children }: { children: React.ReactNode }) {
  const { state, setState } = useTeenWaiver();
  if (!state) return <div className="min-h-[50dvh]" aria-busy="true" />;
  if (!state.required || state.signed) return <>{children}</>;
  if (state.locked) return <WaitingScreen state={state} onState={setState} />;
  return (
    <>
      <div role="status" className="mx-4 mt-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
        <p className="font-semibold">Parent signature needed in {state.days_left} {state.days_left === 1 ? "day" : "days"}</p>
        <p className="mt-1 text-muted-foreground">Players under 18 need a parent or guardian to sign a waiver. After that date your training plan pauses until they sign.</p>
        <ParentEmailForm state={state} onState={setState} compact />
      </div>
      {children}
    </>
  );
}

function WaitingScreen({ state, onState }: { state: TeenWaiverState; onState: (s: TeenWaiverState) => void }) {
  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 pb-10 pt-[calc(1.25rem+var(--safe-top,0px))]">
      <h1 className="text-2xl font-semibold">{state.parent_email ? "Waiting for your parent's signature" : "Your parent needs to sign first"}</h1>
      <p className="text-sm text-muted-foreground">
        Players under 18 need a parent or guardian to sign a waiver before using the training plan.
        {state.parent_email ? " We emailed them a link. Your plan opens as soon as they sign." : " Enter their email and we'll send them a link to sign."}
      </p>
      <ParentEmailForm state={state} onState={onState} />
      <p className="text-sm text-muted-foreground">Everything else in the app is still open.</p>
      <Button asChild variant="outline" className="h-11 w-full"><Link to="/dashboard">Go to the dashboard</Link></Button>
    </main>
  );
}

function ParentEmailForm({ state, onState, compact }: { state: TeenWaiverState; onState: (s: TeenWaiverState) => void; compact?: boolean }) {
  const [editing, setEditing] = useState(!state.parent_email);
  const [email, setEmail] = useState(state.parent_email ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (action: "request" | "resend") => {
    setBusy(true); setMsg(null);
    try {
      const s = await callTeenWaiver<TeenWaiverState>(action, action === "request" ? { email, phone: phone || undefined } : {});
      onState(s); setEditing(false);
      setMsg(s.email?.status === "sent" ? { ok: true, text: `Link sent to ${s.parent_email}.` } : { ok: false, text: "Saved, but the email didn't send. Try Resend in a minute." });
    } catch (e: any) { setMsg({ ok: false, text: TEEN_WAIVER_ERRORS[e.code] ?? TEEN_WAIVER_ERRORS.failed }); }
    finally { setBusy(false); }
  };

  if (!editing && state.parent_email) {
    return (
      <div className={compact ? "mt-2 space-y-2" : "space-y-3 rounded-lg border p-3"}>
        <p className="text-sm break-words">Parent email: <span className="font-medium">{state.parent_email}</span></p>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-[44px] flex-1" disabled={busy} onClick={() => run("resend")}>{busy ? "Sending…" : "Resend link"}</Button>
          <Button variant="outline" className="min-h-[44px] flex-1" onClick={() => { setEditing(true); setMsg(null); }}>Change email</Button>
        </div>
        {msg && <p role="status" className={msg.ok ? "text-sm" : "text-sm text-destructive"}>{msg.text}</p>}
      </div>
    );
  }
  return (
    <div className={compact ? "mt-2 space-y-2" : "space-y-3 rounded-lg border p-3"}>
      <div className="space-y-1.5"><Label htmlFor="tw-email">Parent or guardian email</Label><Input id="tw-email" type="email" inputMode="email" autoComplete="off" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="tw-phone">Parent phone (optional)</Label><Input id="tw-phone" type="tel" inputMode="tel" className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <Button className="h-11 w-full" disabled={busy || !email.includes("@")} onClick={() => run("request")}>{busy ? "Sending…" : "Send signing link"}</Button>
      {msg && <p role="status" className={msg.ok ? "text-sm" : "text-sm text-destructive"}>{msg.text}</p>}
    </div>
  );
}
