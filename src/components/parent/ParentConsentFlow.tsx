/**
 * Parent or guardian steps for an under-13 account (switch under13_parent_program).
 * mode "signup": brand-new account — nothing is saved until the parent signs.
 * mode "sign":   an existing paused account — the parent signs for it.
 * After signing, the account stays locked until the parent's payment is
 * confirmed (ParentPaymentStep).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { branding } from "@/branding";
import { SignaturePad } from "./SignaturePad";
import { UNDER_13_LOCK_KEY } from "@/lib/auth/under13Lock";
import { callParentConsent, fetchConsentTexts, yearsOn, PARENT_ERRORS, PROMISE_VERSION, NOTICE_VERSION, TRAINING_OPT_IN_TEXT } from "@/lib/parent/parentConsent";

const RELATIONSHIPS = ["Mother", "Father", "Legal guardian", "Other parent"];

export function ParentConsentFlow({ mode, accountEmail, onSigned }: { mode: "signup" | "sign"; accountEmail?: string; onSigned?: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [texts, setTexts] = useState({ promise: "", notice: "" });
  const [f, setF] = useState({ parentName: "", relationship: "", parentDob: "", email: accountEmail ?? "", password: "", childName: "", childDob: "" });
  const [typed, setTyped] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [trainingOptIn, setTrainingOptIn] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchConsentTexts().then(setTexts).catch(() => undefined); }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const parentAge = yearsOn(f.parentDob);
  const childAge = yearsOn(f.childDob);
  const detailsError = useMemo(() => {
    if (f.parentName.trim().split(/\s+/).length < 2) return "Enter your full legal name (first and last).";
    if (!f.relationship) return "Choose your relationship to the child.";
    if (parentAge === null) return "Enter your birthdate.";
    if (parentAge < 18) return PARENT_ERRORS.parent_not_adult;
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return "Enter your email.";
    if (mode === "signup" && f.password.length < 6) return "Choose a password of at least 6 characters.";
    if (!f.childName.trim()) return "Enter the child's first name or nickname.";
    if (mode === "signup" && (childAge === null || childAge >= 13 || childAge < 0)) return "Enter the child's birthdate (under 13).";
    return null;
  }, [f, parentAge, childAge, mode]);

  const promiseText = texts.promise.replace("[child's name]", f.childName.trim() || "my child");
  const canSign = typed.trim().toLowerCase() === f.parentName.trim().toLowerCase() && agreed && !!sig;

  const submit = async () => {
    setBusy(true); setError(null);
    const common = {
      parent_full_name: f.parentName.trim(), relationship: f.relationship, parent_birthdate: f.parentDob,
      child_display_name: f.childName.trim(), typed_name: typed.trim(), agreed: true, signature_png: sig,
      promise_version: PROMISE_VERSION, notice_version: NOTICE_VERSION, parent_email: f.email.trim(), training_opt_in: trainingOptIn,
    };
    try {
      if (mode === "signup") {
        await callParentConsent("signup", { ...common, child_birthdate: f.childDob, password: f.password });
        const { error: e } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (e) throw e;
        try { localStorage.removeItem(UNDER_13_LOCK_KEY); } catch { /* storage unavailable */ }
        navigate("/pricing", { replace: true }); // straight to checkout
      } else {
        await callParentConsent("sign", common);
        onSigned?.();
        navigate("/pricing", { replace: true });
      }
    } catch (e: any) {
      setError(PARENT_ERRORS[e?.code] ?? "Something went wrong. Nothing was charged. Please try again.");
    } finally { setBusy(false); }
  };

  const total = 3;
  return (
    <main className="flex min-h-[100dvh] justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.25rem+var(--safe-top))]">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-3">
          {step > 0 && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setStep(step - 1)}><ArrowLeft className="h-5 w-5" /></Button>}
          <img src={branding.logo} alt={branding.appName} className="h-9 w-9 object-contain" />
          <div className="flex-1"><Progress value={((step + 1) / (total + 1)) * 100} /></div>
        </div>

        {step === 0 && (
          <section className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15"><ShieldCheck className="h-7 w-7 text-primary" /></div>
            <h1 className="text-2xl font-semibold leading-tight">{mode === "signup" ? "A parent or guardian must finish this signup." : "Parent signature required"}</h1>
            <p className="text-base leading-7 text-muted-foreground">
              Players under 13 use Hammers Modality on an account their parent or guardian controls. It takes three steps: your details, the Parent Notice and your signature, then your card payment. The account opens only after both your signature and payment are confirmed.
            </p>
            <p className="text-sm text-muted-foreground">Nothing is saved until you sign.</p>
            <Button className="h-12 w-full text-base" onClick={() => setStep(1)}>I'm the parent or guardian — continue</Button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold">Step 1 of 3 · Your details</h1>
            <div className="space-y-1.5"><Label htmlFor="pn">Your full legal name</Label><Input id="pn" autoComplete="name" value={f.parentName} onChange={set("parentName")} /></div>
            <div className="space-y-1.5">
              <Label>Your relationship to the child</Label>
              <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIPS.map((r) => (
                  <Button key={r} type="button" variant={f.relationship === r ? "default" : "outline"} className="h-11" onClick={() => setF((s) => ({ ...s, relationship: r }))}>{r}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="pd">Your birthdate</Label><Input id="pd" type="date" value={f.parentDob} onChange={set("parentDob")} /></div>
            <div className="space-y-1.5">
              <Label htmlFor="pe">Your email {mode === "signup" ? "(this is the account's login)" : "(where we contact you)"}</Label>
              <Input id="pe" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} />
            </div>
            {mode === "signup" && <div className="space-y-1.5"><Label htmlFor="pw">Choose a password</Label><Input id="pw" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} /></div>}
            <div className="space-y-1.5"><Label htmlFor="cn">Child's first name or nickname only</Label><Input id="cn" value={f.childName} onChange={set("childName")} /></div>
            {mode === "signup" && <div className="space-y-1.5"><Label htmlFor="cd">Child's birthdate</Label><Input id="cd" type="date" value={f.childDob} onChange={set("childDob")} /></div>}
            {detailsError && (f.parentName || f.parentDob) && <p role="alert" className="text-sm text-destructive">{detailsError}</p>}
            <Button className="h-12 w-full text-base" disabled={!!detailsError} onClick={() => setStep(2)}>Next</Button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold">Step 2 of 3 · Parent Notice</h1>
            <div className="max-h-[55dvh] overflow-y-auto whitespace-pre-line rounded-xl border bg-card p-4 text-sm leading-6">{texts.notice || "Loading…"}</div>
            <Button className="h-12 w-full text-base" disabled={!texts.notice} onClick={() => setStep(3)}>I've read it — next</Button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold">Step 3 of 3 · Parent Promise</h1>
            <p className="rounded-xl border bg-card p-4 text-sm leading-6">{promiseText}</p>
            <div className="space-y-1.5"><Label htmlFor="tn">Type your full legal name</Label><Input id="tn" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={f.parentName} /></div>
            <div className="space-y-1.5"><Label>Sign here</Label><SignaturePad onChange={setSig} /></div>
            <label className="flex items-start gap-3 text-sm leading-6">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" />
              <span>I agree to the Parent Promise and the Parent Notice.</span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border p-3 text-sm leading-6">
              <Checkbox checked={trainingOptIn} onCheckedChange={(v) => setTrainingOptIn(v === true)} className="mt-1" aria-label="Optional: help improve Hammers Modality" />
              <span>{TRAINING_OPT_IN_TEXT}</span>
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full text-base" disabled={!canSign || busy} onClick={submit}>{busy ? "Saving…" : "Sign the Parent Promise"}</Button>
            <p className="text-center text-xs text-muted-foreground">Next: your card payment. The account stays locked until it's confirmed.</p>
          </section>
        )}
      </div>
    </main>
  );
}

/** After signing: the parent pays (or confirms a card) on the normal plans; then we unlock. */
export function ParentPaymentStep({ childName, onUnlocked }: { childName: string; onUnlocked: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const check = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await callParentConsent<{ ok: boolean; reason?: string }>("finalize");
      if (r.ok) onUnlocked();
      else setMsg(r.reason === "payment_missing" ? "We don't see a confirmed payment yet. If your card was declined, choose a plan and try again." : "Your signature isn't on file yet.");
    } catch { setMsg("We couldn't check right now. Please try again."); }
    finally { setBusy(false); }
  };
  // Opens right away when this account already has an active, paid plan (no second charge).
  useEffect(() => {
    callParentConsent<{ ok: boolean }>("finalize").then((r) => { if (r.ok) onUnlocked(); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))]">
      <div className="w-full max-w-sm space-y-5 text-center">
        <img src={branding.logo} alt={branding.appName} className="mx-auto h-12 w-12 object-contain" />
        <h1 className="text-2xl font-semibold leading-tight">Signed — one step left</h1>
        <p className="text-base leading-7 text-muted-foreground">
          Your Parent Promise for {childName} is signed. Choose a plan and pay by card (same plans and prices as everyone). The account opens as soon as your payment is confirmed.
        </p>
        <Button className="h-12 w-full text-base" onClick={() => navigate("/pricing")}>Choose a plan and pay</Button>
        <Button variant="outline" className="h-12 w-full" disabled={busy} onClick={check}>{busy ? "Checking…" : "I've paid — open the account"}</Button>
        {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
      </div>
    </main>
  );
}
