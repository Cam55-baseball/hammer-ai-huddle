import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BackButton } from "@/components/common/BackButton";
import { LegalDocLink } from "@/components/legal/LegalDocLink";
import { ParentConsentFlow } from "@/components/parent/ParentConsentFlow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema } from "@/lib/email";
import { fetchLatestDoc, recordConsent } from "@/lib/legal/legalV2";
import { staffAgeProblem, STAFF_NEXT, type StaffRole } from "@/lib/auth/staffSignup";

const TITLES: Record<StaffRole, string> = {
  coach: "Create your coach account",
  scout: "Create your scout or recruiter account",
  organization: "Create your organization admin account",
};

/** Account step for coaches, scouts and organization admins (adults only). */
export default function StaffSignup() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const [f, setF] = useState({ first: "", last: "", email: "", password: "", dob: "", sport: "baseball", terms: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const r = role as StaffRole;
  const valid = r === "coach" || r === "scout" || r === "organization";

  // Already signed in: go straight to this role's next step.
  useEffect(() => {
    if (valid && user && !busy) { localStorage.setItem("signupRole", r); navigate(STAFF_NEXT[r], { replace: true }); }
  }, [user, valid, r, busy, navigate]);

  if (role === "parent") return (
    <div className="min-h-screen px-4 pt-safe pb-safe"><div className="mx-auto max-w-lg space-y-4 py-4"><BackButton /><ParentConsentFlow mode="signup" /></div></div>
  );
  if (!valid) return <Navigate to="/get-started" replace />;

  const submit = async () => {
    setErr(null);
    if (!f.first.trim() || !f.last.trim()) return setErr("Enter your first and last name.");
    const em = emailSchema().safeParse(f.email);
    if (!em.success) return setErr("Enter a valid email address.");
    if (f.password.length < 8) return setErr("Use a password with at least 8 characters.");
    const age = staffAgeProblem(f.dob);
    if (age) return setErr(age);
    if (!f.terms) return setErr("Agree to the Terms and Privacy Policy to continue.");
    setBusy(true);
    try {
      const { data, error } = await signUp(em.data, f.password, `${f.first.trim()} ${f.last.trim()}`, { date_of_birth: f.dob, age_band: "adult" });
      if (error) return setErr(error.message);
      if (!data?.session) {
        const s = await supabase.auth.signInWithPassword({ email: em.data, password: f.password });
        if (s.error) return setErr("Your account was created. Check your email to confirm it, then sign in.");
      }
      // One-time acceptance of the current Terms and Privacy Policy.
      for (const slug of ["terms", "privacy"]) {
        try { const d = await fetchLatestDoc(slug); if (d) await recordConsent({ slug, version: d.version, choice: "accepted", method: "signup_checkbox", details: { role: r } }); }
        catch (e) { console.warn("[staff-signup] consent save failed", slug, e); }
      }
      localStorage.setItem("signupRole", r);
      localStorage.setItem("scoutSport", f.sport);
      navigate(STAFF_NEXT[r], { replace: true });
    } finally { setBusy(false); }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-lg space-y-4 py-4">
        <BackButton />
        <h1 className="text-2xl font-bold">{TITLES[r]}</h1>
        <p className="text-sm text-muted-foreground">Step 1 of 2: your account. You must be 18 or older.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="ss-first">First name</Label><Input id="ss-first" className="h-11" value={f.first} onChange={set("first")} autoComplete="given-name" /></div>
          <div><Label htmlFor="ss-last">Last name</Label><Input id="ss-last" className="h-11" value={f.last} onChange={set("last")} autoComplete="family-name" /></div>
        </div>
        <div><Label htmlFor="ss-email">Email</Label><Input id="ss-email" type="email" autoComplete="email" className="h-11" value={f.email} onChange={set("email")} placeholder="you@example.com" /></div>
        <div><Label htmlFor="ss-pass">Password</Label><Input id="ss-pass" type="password" autoComplete="new-password" className="h-11" value={f.password} onChange={set("password")} /></div>
        <div><Label htmlFor="ss-dob">Date of birth</Label><Input id="ss-dob" type="date" className="h-11" value={f.dob} onChange={set("dob")} max={new Date().toISOString().slice(0, 10)} /></div>
        <div>
          <Label>Sport</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["baseball", "softball", "both"].map((s) => (
              <Button key={s} type="button" variant={f.sport === s ? "default" : "outline"} onClick={() => setF({ ...f, sport: s })} className="h-11 capitalize">{s}</Button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
          <Checkbox id="ss-terms" checked={f.terms} onCheckedChange={(v) => setF({ ...f, terms: v === true })} aria-label="Agree to terms" />
          <span>I agree to the <LegalDocLink slug="terms" className="text-foreground underline">Terms</LegalDocLink> and <LegalDocLink slug="privacy" className="text-foreground underline">Privacy Policy</LegalDocLink>.</span>
        </label>
        {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
        <Button className="h-12 w-full" disabled={busy} onClick={submit}>{busy ? "Creating account…" : "Create account and continue"}</Button>
      </div>
    </div>
  );
}
