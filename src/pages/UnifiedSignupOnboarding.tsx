import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, X } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { branding } from "@/branding";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import { HeightFeetInchesInput, heightToInches } from "@/components/shared/HeightFeetInchesInput";
import { NotificationPrimer, shouldAskNotifications } from "@/components/onboarding/NotificationPrimer";

type Draft = {
  step: number; email: string; password: string; firstName: string; lastName: string;
  avatarName: string; sport: "baseball" | "softball" | ""; position: string;
  battingSide: string; throwingHand: string; dateOfBirth: string; guardianEmail: string;
  acceptedTerms: boolean; height: string; weight: string; graduationYear: string;
  state: string; team: string; level: string; wingspan: string; footLength: string;
  careerGoal: string; accountCreated: boolean; awaitingConfirmation: boolean;
};

const EMPTY: Draft = {
  step: 0, email: "", password: "", firstName: "", lastName: "", avatarName: "", sport: "",
  position: "", battingSide: "", throwingHand: "", dateOfBirth: "", guardianEmail: "",
  acceptedTerms: false, height: "", weight: "", graduationYear: "", state: "", team: "", level: "",
  wingspan: "", footLength: "", careerGoal: "", accountCreated: false, awaitingConfirmation: false,
};

export const UNIFIED_SIGNUP_DRAFT_KEY = "hm.unifiedSignupDraft.v1";
const STORAGE_KEY = UNIFIED_SIGNUP_DRAFT_KEY;
/**
 * Owner ruling 2026-10-03: body fat, equipment, injury check, recovery targets
 * and mental focus are collected after a module purchase, not here.
 */
const SCREENS = [
  "email", "password", "age", "name", "photo", "sport", "play",
  "height", "graduation", "team", "level", "body", "career", "review", "finish",
] as const;
type ScreenKey = typeof SCREENS[number];
const GROUP: Record<ScreenKey, string> = {
  email: "Account", password: "Account", age: "Account", name: "About you", photo: "About you",
  sport: "Your game", play: "Your game", height: "Profile", graduation: "Profile", team: "Team",
  level: "Team", body: "Body", career: "Goals", review: "Review", finish: "Review",
};
const AFTER_ACCOUNT = SCREENS.indexOf("height");

/** Supabase errors are plain objects — surface their real message. */
function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "Unknown error";
}

function loadDraft(): Draft {
  try {
    const d = { ...EMPTY, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"), password: "" } as Draft;
    return { ...d, step: Math.min(Math.max(0, Number(d.step) || 0), SCREENS.length - 1) };
  }
  catch { return EMPTY; }
}
function yearsOld(raw: string) {
  const dob = new Date(`${raw}T00:00:00.000Z`); const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export default function UnifiedSignupOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, session, signUp } = useAuth();
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const finishing = useRef(false);
  const minor = draft.dateOfBirth ? yearsOld(draft.dateOfBirth) >= 13 && yearsOld(draft.dateOfBirth) < 18 : false;
  const screen: ScreenKey = SCREENS[draft.step] ?? "finish";

  useEffect(() => {
    if (finishing.current) return;
    const safe = { ...draft, password: "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [draft]);

  useEffect(() => {
    if (!user?.id || !session || finishing.current) return;
    if (draft.awaitingConfirmation || searchParams.get("confirmed") === "1") {
      setDraft((d) => ({ ...d, accountCreated: true, awaitingConfirmation: false, step: Math.max(d.step, AFTER_ACCOUNT) }));
    }
  }, [user?.id, session, searchParams, draft.awaitingConfirmation]);

  /** Save & exit: answers already live on this device (and on the account once it exists). */
  const exitRef = useRef<() => void>(() => {});
  exitRef.current = () => {
    if (finishing.current) return;
    toast({ title: "Progress saved", description: "Your answers are saved. Come back anytime to finish where you left off." });
    if (user?.id && session) navigate("/dashboard", { replace: true });
    else if (draft.accountCreated) navigate("/auth", { replace: true });
    else navigate("/", { replace: true });
  };

  // Escape and the phone back gesture both mean "save & exit" — never a dead end.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || primerOpen) return;
      if (document.querySelector("[role='listbox'],[role='dialog']")) return; // let open pickers close first
      exitRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primerOpen]);
  useEffect(() => {
    window.history.pushState({ hmOnboardingGuard: true }, "");
    const onPop = () => exitRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const progress = Math.round(((draft.step + 1) / SCREENS.length) * 100);
  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  const fail = (message: string) => { toast({ title: "One more thing", description: message, variant: "destructive" }); return false; };

  const valid = () => {
    const s = screen;
    if (s === "email" && !z.string().email().safeParse(draft.email).success) return fail("Enter a valid email address.");
    if (s === "password" && draft.password.length < 6) return fail("Use at least 6 characters for your password.");
    if (s === "age") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dateOfBirth)) return fail("Enter your date of birth.");
      if (minor && !z.string().email().safeParse(draft.guardianEmail).success) return fail("Enter a valid parent or guardian email.");
    }
    if (s === "name" && (!draft.firstName.trim() || !draft.lastName.trim())) return fail("Enter your first and last name.");
    if (s === "sport" && (!draft.sport || !draft.position.trim())) return fail("Choose your sport and enter your position.");
    if (s === "play" && (!draft.battingSide || !draft.throwingHand)) return fail("Choose how you bat and throw.");
    if (s === "height" && (!heightToInches(draft.height) || !draft.weight)) return fail("Choose your height and enter your weight.");
    if (s === "graduation" && !/^\d{4}$/.test(draft.graduationYear)) return fail("Enter a four-digit graduation year.");
    if (s === "team" && (!draft.state.trim() || !draft.team.trim())) return fail("Enter your state and team.");
    if (s === "level" && !draft.level) return fail("Choose your current level.");
    return true;
  };

  const createAccount = async () => {
    if (!draft.acceptedTerms) return fail("Agree to the Terms of Service and Privacy Policy to create your account.");
    setBusy(true);
    try {
      const { data: age, error: ageError } = await supabase.functions.invoke("signup-age-check", { body: { date_of_birth: draft.dateOfBirth } });
      if (ageError || !age || typeof age.allowed !== "boolean") return fail("We couldn't verify age. Please try again.");
      if (!age.allowed) return fail(age.message ?? "Account creation can't continue for this age.");
      const fullName = `${draft.firstName.trim()} ${draft.lastName.trim()}`;
      const { data, error } = await signUp(draft.email.trim(), draft.password, fullName, {
        date_of_birth: draft.dateOfBirth,
        age_band: age.age_band,
        ...(age.age_band === "minor_13_17" ? { guardian_email: draft.guardianEmail.trim() } : {}),
      });
      if (error) return fail(error.message);
      if (!data.session) {
        patch({ accountCreated: true, awaitingConfirmation: true, step: AFTER_ACCOUNT, password: "" });
        return true;
      }
      patch({ accountCreated: true, awaitingConfirmation: false, step: AFTER_ACCOUNT, password: "" });
      return true;
    } finally { setBusy(false); }
  };

  const next = async () => {
    if (!valid()) return;
    if (screen === "play" && !draft.accountCreated) { await createAccount(); return; }
    setDirection(1); patch({ step: Math.min(draft.step + 1, SCREENS.length - 1) });
  };
  const back = () => { setDirection(-1); patch({ step: Math.max(0, draft.step - 1) }); };

  /**
   * Every write here is idempotent, so a failed Finish can simply be retried.
   * The device draft is only cleared after every write succeeds.
   */
  const finish = async () => {
    if (!user?.id) return fail("Confirm your email, then return here to finish.");
    setBusy(true);
    setSaveError(null);
    let stage = "profile photo";
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const uploaded = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploaded.error) throw uploaded.error;
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      stage = "profile";
      const profile = {
        id: user.id, first_name: draft.firstName.trim(), last_name: draft.lastName.trim(),
        full_name: `${draft.firstName.trim()} ${draft.lastName.trim()}`,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        date_of_birth: draft.dateOfBirth, position: draft.position.trim(), experience_level: draft.level,
        height: draft.height, weight: draft.weight, state: draft.state.trim(),
        high_school_grad_year: Number(draft.graduationYear), graduation_year: Number(draft.graduationYear),
        team_affiliation: draft.team.trim(), throwing_hand: draft.throwingHand as "L" | "R",
        // profiles.batting_side enum is R/L/B — "Switch" is stored as B there.
        batting_side: (draft.battingSide === "S" ? "B" : draft.battingSide) as "L" | "R" | "B",
      };
      const profileWrite = await supabase.from("profiles").upsert(profile as never);
      if (profileWrite.error) throw profileWrite.error;
      stage = "athlete role";
      // Regular users may add a role but never update one, so only insert when missing.
      const existingRole = await supabase.from("user_roles").select("id").eq("user_id", user.id).eq("role", "player").maybeSingle();
      if (existingRole.error) throw existingRole.error;
      if (!existingRole.data) {
        const roleWrite = await supabase.from("user_roles").insert({ user_id: user.id, role: "player", status: "active" });
        if (roleWrite.error && roleWrite.error.code !== "23505") throw roleWrite.error;
      }
      stage = "training profile";
      const heightIn = heightToInches(draft.height);
      // Merge so measurements entered elsewhere (e.g. body fat %) are never wiped.
      const prior = await supabase.from("athlete_context").select("anthropometrics").eq("user_id", user.id).maybeSingle();
      const priorAnthro = ((prior.data as { anthropometrics?: Record<string, unknown> } | null)?.anthropometrics ?? {}) as Record<string, unknown>;
      const answers: Array<[string, unknown]> = [
        ["sport_primary", draft.sport],
        ["position_primary", draft.position.trim()],
        ["throws_hand", draft.throwingHand],
        ["bats_hand", draft.battingSide],
        ["competition_home_state", draft.state.trim()],
        ["competition_level", draft.level],
        ["anthropometrics", { ...priorAnthro, height_in: heightIn, weight_lb: Number(draft.weight) || null, wingspan_in: Number(draft.wingspan) || (priorAnthro.wingspan_in ?? null), foot_length_in: Number(draft.footLength) || (priorAnthro.foot_length_in ?? null) }],
      ];
      if (draft.careerGoal.trim()) answers.push(["level_target", draft.careerGoal.trim()]);
      // Sequential: each write merges the shared confidence map.
      for (const [key, value] of answers) await persistContextAnswer(user.id, key, value, "onboarding.unified");
      finishing.current = true;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem("selectedSport", draft.sport);
      if (shouldAskNotifications(user.id)) setPrimerOpen(true);
      else navigate("/dashboard", { replace: true });
    } catch (error) {
      const detail = errorText(error);
      console.error(`[onboarding] Finish failed at ${stage}:`, error);
      setSaveError(`We couldn't save your ${stage} (${detail}). Every answer is still here — tap Finish to try again.`);
    } finally { setBusy(false); }
  };

  if (draft.awaitingConfirmation && !session) {
    return <Frame step={draft.step} progress={progress} group="Account" onExit={() => exitRef.current()}>
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-full border border-primary/30 bg-primary/10"><Mail className="h-7 w-7 text-primary" /></div>
        <h1 className="text-3xl font-semibold">Check your email</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Open the confirmation link we sent to <strong className="text-foreground">{draft.email}</strong>. Your answers are saved on this device.</p>
        <Button className="mt-8 w-full" variant="outline" onClick={() => navigate("/auth")}>Back to sign in</Button>
      </div>
    </Frame>;
  }

  const toggle = (v: string, cur: string, label: string, onPick: (v: string) => void) => choice(v, cur, label, onPick);

  return <Frame step={draft.step} progress={progress} group={GROUP[screen]} onExit={() => exitRef.current()}>
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div key={draft.step} custom={direction} initial={{ opacity: 0, x: direction * 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -18 }} transition={{ duration: 0.22 }} className="flex min-h-[430px] flex-col motion-reduce:transform-none">
        <div className="flex-1">{renderStep()}</div>
        {saveError && screen === "finish" && <div role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">{saveError}</div>}
        <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-12 w-12" onClick={back} disabled={draft.step === 0 || busy}><ArrowLeft className="h-5 w-5" /></Button>
          {draft.step < SCREENS.length - 1 ? <Button className="h-12 flex-1 text-base" onClick={next} disabled={busy}>{busy ? "Creating your account…" : "Next"}<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button className="h-12 flex-1 text-base" onClick={finish} disabled={busy}>{busy ? "Saving…" : saveError ? "Try again" : "Finish"}<Check className="ml-2 h-4 w-4" /></Button>}
        </div>
      </motion.div>
    </AnimatePresence>
    {user?.id && <NotificationPrimer uid={user.id} open={primerOpen} onDone={() => navigate("/dashboard", { replace: true })} />}
  </Frame>;

  function title(text: string, help?: string) { return <div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase text-primary">{GROUP[screen]}</p><h1 className="text-3xl font-semibold leading-tight">{text}</h1>{help && <p className="mt-3 text-sm leading-6 text-muted-foreground">{help}</p>}</div>; }
  function choice(value: string, current: string, label: string, onPick: (v: string) => void) { const active = value === current; return <Button key={value} type="button" variant={active ? "default" : "outline"} className="h-12 justify-start" onClick={() => onPick(value)}>{active && <Check className="mr-2 h-4 w-4" />}{label}</Button>; }
  function renderStep() {
    switch (screen) {
      case "email": return <>{title("What's your email?", "This will be your sign-in and the place we send account updates.")}<Label htmlFor="new-email">Email</Label><div className="relative mt-2"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input id="new-email" autoFocus type="email" autoComplete="email" className="h-12 pl-10" value={draft.email} onChange={(e) => patch({ email: e.target.value })} placeholder="you@example.com" /></div></>;
      case "password": return <>{title("Create a strong password")}<Label htmlFor="new-password">Password</Label><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"/><Input id="new-password" autoFocus type={showPassword ? "text" : "password"} autoComplete="new-password" className="h-12 pl-10 pr-11" value={draft.password} onChange={(e) => patch({ password: e.target.value })}/><Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</Button></div><p className="mt-2 text-xs text-muted-foreground">At least 6 characters. For your security, passwords are never saved as draft answers.</p></>;
      case "age": return <>{title("When were you born?", "This keeps the existing age protections in place.")}<Label htmlFor="new-dob">Date of birth</Label><Input id="new-dob" type="date" className="mt-2 h-12" max={new Date().toISOString().slice(0,10)} value={draft.dateOfBirth} onChange={(e) => patch({ dateOfBirth: e.target.value })}/>{minor && <div className="mt-4"><Label htmlFor="guardian">Parent or guardian email</Label><Input id="guardian" type="email" className="mt-2 h-12" value={draft.guardianEmail} onChange={(e) => patch({ guardianEmail: e.target.value })}/><p className="mt-2 text-xs leading-5 text-muted-foreground">We'll notify them that this account was created and how to contact support.</p></div>}</>;
      case "name": return <>{title("What should we call you?")}<div className="grid gap-4"><div><Label htmlFor="first">First name</Label><Input id="first" autoFocus className="mt-2 h-12" value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })}/></div><div><Label htmlFor="last">Last name</Label><Input id="last" className="mt-2 h-12" value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })}/></div></div></>;
      case "photo": return <>{title("Add a profile photo", "Optional. You can change it later.")}<label className="mx-auto flex h-48 w-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border border-dashed border-primary/50 bg-primary/5 text-center">{avatarPreview ? <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover"/> : <><Camera className="mb-3 h-8 w-8 text-primary"/><span className="text-sm font-medium">Choose photo</span><span className="mt-1 text-xs text-muted-foreground">Up to 5 MB</span></>}<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f=e.target.files?.[0]; if(!f) return; if(f.size>5*1024*1024){ fail("Choose a photo smaller than 5 MB."); return; } setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); patch({avatarName:f.name}); }}/></label></>;
      case "sport": return <>{title("What's your game?")}<div className="grid grid-cols-2 gap-3">{toggle("baseball",draft.sport,"Baseball",v=>patch({sport:v as Draft["sport"]}))}{toggle("softball",draft.sport,"Softball",v=>patch({sport:v as Draft["sport"]}))}</div><div className="mt-5"><Label htmlFor="position">Primary position</Label><Input id="position" className="mt-2 h-12" value={draft.position} onChange={(e)=>patch({position:e.target.value})} placeholder="Pitcher, catcher, shortstop…"/></div></>;
      case "play": return <>{title("How do you play?", "Your account is created after this screen so every answer that follows can save to you.")}<div className="space-y-5"><div><Label>Batting side</Label><div className="mt-2 grid grid-cols-3 gap-2">{[["R","Right"],["L","Left"],["S","Switch"]].map(([v,l])=>toggle(v,draft.battingSide,l,x=>patch({battingSide:x})))}</div></div><div><Label>Throwing hand</Label><div className="mt-2 grid grid-cols-2 gap-2">{[["R","Right"],["L","Left"]].map(([v,l])=>toggle(v,draft.throwingHand,l,x=>patch({throwingHand:x})))}</div></div><div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/30 p-3"><Checkbox id="terms" checked={draft.acceptedTerms} onCheckedChange={(v)=>patch({acceptedTerms:v===true})}/><Label htmlFor="terms" className="text-xs font-normal leading-5 text-muted-foreground">I agree to the <Link className="text-foreground underline" target="_blank" to="/terms">Terms</Link> and <Link className="text-foreground underline" target="_blank" to="/privacy">Privacy Policy</Link>.</Label></div></div></>;
      case "height": return <>{title("Build your physical profile")}<div className="grid gap-5"><div><Label htmlFor="height">Height</Label><div className="mt-2"><HeightFeetInchesInput id="height" value={draft.height} onChange={(v)=>patch({height:v})}/></div></div><div><Label htmlFor="weight">Weight (lb)</Label><Input id="weight" inputMode="numeric" type="number" className="mt-2 h-12" value={draft.weight} onChange={(e)=>patch({weight:e.target.value})}/></div></div></>;
      case "graduation": return <>{title("When do you graduate?")}<Label htmlFor="grad">Graduation year</Label><Input id="grad" autoFocus inputMode="numeric" type="number" min="2020" max="2045" className="mt-2 h-12" value={draft.graduationYear} onChange={(e)=>patch({graduationYear:e.target.value})} placeholder="2028"/></>;
      case "team": return <>{title("Where do you compete?")}<div className="grid gap-4"><div><Label htmlFor="state">State</Label><Input id="state" className="mt-2 h-12" value={draft.state} onChange={(e)=>patch({state:e.target.value})} placeholder="Texas"/></div><div><Label htmlFor="team">Team</Label><Input id="team" className="mt-2 h-12" value={draft.team} onChange={(e)=>patch({team:e.target.value})} placeholder="Team name"/></div></div></>;
      case "level": return <>{title("What's your current level?")}<Select value={draft.level} onValueChange={(v)=>patch({level:v})}><SelectTrigger className="h-12"><SelectValue placeholder="Choose a level"/></SelectTrigger><SelectContent>{["Youth","Middle School","High School","College","Professional","Recreational"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></>;
      case "body": return <>{title("Add body measurements", "Optional. Leave anything blank rather than guessing.")}<div className="grid gap-4"><div><Label htmlFor="wing">Wingspan (inches)</Label><Input id="wing" inputMode="decimal" type="number" className="mt-2 h-12" value={draft.wingspan} onChange={(e)=>patch({wingspan:e.target.value})}/></div><div><Label htmlFor="foot">Foot length (inches)</Label><Input id="foot" inputMode="decimal" type="number" className="mt-2 h-12" value={draft.footLength} onChange={(e)=>patch({footLength:e.target.value})}/><p className="mt-2 text-xs leading-5 text-muted-foreground">Barefoot, heel to longest toe.</p></div></div></>;
      case "career": return <>{title("Where do you want the game to take you?", "Optional.")}<Label htmlFor="career">Career goal</Label><Textarea id="career" autoFocus className="mt-2" rows={4} value={draft.careerGoal} onChange={(e)=>patch({careerGoal:e.target.value})} placeholder="Play in college, earn a starting role…"/></>;
      case "review": return <>{title("Review your foundation", "Use Back to change anything before finishing.")}<div className="grid gap-2 text-sm"><Summary label="Athlete" value={`${draft.firstName} ${draft.lastName}`}/><Summary label="Game" value={`${draft.sport} · ${draft.position}`}/><Summary label="Profile" value={`${draft.height} · ${draft.weight} lb · ${draft.graduationYear}`}/><Summary label="Team" value={`${draft.team} · ${draft.level}`}/><Summary label="Goal" value={draft.careerGoal.trim() || "Not added"}/></div></>;
      default: return <>{title("Ready to build your game plan?")}<div className="rounded-md border border-primary/20 bg-primary/5 p-5"><ShieldCheck className="mb-4 h-7 w-7 text-primary"/><p className="font-medium">Your foundation is ready.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Finish to save your answers. Then we'll ask about notifications before your dashboard and guided tour begin.</p></div></>;
    }
  }
}

function Summary({label,value}:{label:string;value:string}) { return <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium capitalize">{value}</span></div>; }
function Frame({ step, progress, group, children, onExit }:{step:number;progress:number;group:string;children:React.ReactNode;onExit:()=>void}) {
  return <main className="min-h-[100dvh] overflow-hidden bg-background px-4 pb-[calc(1rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))]">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.16),transparent_42%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col">
      <header className="mb-4 flex items-center justify-between"><img src={branding.logo} alt={branding.appName} className="h-9 w-9 object-contain"/><span className="text-xs font-medium text-muted-foreground">{group}</span><span className="flex items-center gap-1"><span className="text-xs tabular-nums text-muted-foreground">{step+1}/{SCREENS.length}</span><Button type="button" variant="ghost" className="h-11 gap-1 px-3 text-xs" aria-label="Save and exit" onClick={onExit}><X className="h-4 w-4"/>Exit</Button></span></header>
      <p className="-mt-2 mb-3 text-center text-[11px] text-muted-foreground">Exit anytime — your answers are saved so you can finish later.</p>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${progress}%`}}/></div>
      <section className="relative flex-1 overflow-hidden rounded-lg border border-border/70 bg-card/85 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-7">{children}</section>
    </div>
  </main>;
}
