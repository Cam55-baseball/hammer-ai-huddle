/**
 * CoachOnboarding — the coach's own first-run experience.
 *
 * Coaches don't train inside the app, they run a program. This flow asks
 * about the program: who they coach, what ages, which disciplines, and how
 * their coaching queue reaches them. It never asks athlete training
 * questions and never touches athlete_context.
 *
 * Answers persist to `coach_context` (canonical) plus notification prefs.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Megaphone, Users, Layers, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { AthleteOnboardingShell, StepChipStatus } from "@/components/onboarding/AthleteOnboardingShell";
import { ChipMultiSelect } from "@/components/onboarding/staff/ChipMultiSelect";
import { NotificationsPreferencesPanel } from "@/components/notifications/NotificationsPreferencesPanel";
import { readDraftSlot, writeDraftSlot, clearDraftSlot } from "@/lib/onboarding/draftStore";
import { supabase } from "@/integrations/supabase/client";
import {
  COACH_AGE_GROUPS,
  COACH_DISCIPLINES,
  saveCoachContext,
  positiveIntOrNull,
  type CoachContextDraft,
} from "@/lib/onboarding/staffOnboarding";

const STEPS = ["Welcome", "Program", "Roster", "Focus", "Alerts", "Done"];
const S_WELCOME = 0;
const S_PROGRAM = 1;
const S_ROSTER = 2;
const S_FOCUS = 3;
const S_ALERTS = 4;
const S_DONE = 5;

const DRAFT_SLOT = "coach-onboarding";

export default function CoachOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isCoach, isScout, loading: roleLoading } = useScoutAccess();

  const [step, setStep] = useState(S_WELCOME);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [programName, setProgramName] = useState("");
  const [seasonsRun, setSeasonsRun] = useState("");
  const [athleteCount, setAthleteCount] = useState("");
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [philosophy, setPhilosophy] = useState("");

  useEffect(() => {
    if (roleLoading) return;
    if (!isCoach) navigate(isScout ? "/onboarding/scout" : "/dashboard", { replace: true });
  }, [roleLoading, isCoach, isScout, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: row } = await supabase
          .from("coach_context")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled && row) {
          setOrgName(row.org_name ?? "");
          setProgramName(row.program_name ?? "");
          setSeasonsRun(row.seasons_run ? String(row.seasons_run) : "");
          setAthleteCount(row.athlete_count ? String(row.athlete_count) : "");
          setAgeGroups(row.age_groups ?? []);
          setDisciplines(row.primary_disciplines ?? []);
          setPhilosophy(row.coaching_philosophy ?? "");
        }
        const draft = await readDraftSlot<CoachContextDraft & { stepIndex?: number }>(
          user.id,
          DRAFT_SLOT,
        );
        if (!cancelled && draft) {
          if (draft.org_name) setOrgName(draft.org_name);
          if (draft.program_name) setProgramName(draft.program_name);
          if (draft.seasons_run != null) setSeasonsRun(String(draft.seasons_run));
          if (draft.athlete_count != null) setAthleteCount(String(draft.athlete_count));
          if (draft.age_groups?.length) setAgeGroups(draft.age_groups);
          if (draft.primary_disciplines?.length) setDisciplines(draft.primary_disciplines);
          if (draft.coaching_philosophy) setPhilosophy(draft.coaching_philosophy);
          if (typeof draft.stepIndex === "number" && draft.stepIndex > 0 && draft.stepIndex < S_DONE) {
            setStep(draft.stepIndex);
          }
        }
      } catch {
        /* resume is best-effort */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const currentDraft = useCallback(
    (): CoachContextDraft => ({
      org_name: orgName,
      program_name: programName,
      seasons_run: positiveIntOrNull(seasonsRun),
      athlete_count: positiveIntOrNull(athleteCount),
      age_groups: ageGroups,
      primary_disciplines: disciplines,
      coaching_philosophy: philosophy,
    }),
    [orgName, programName, seasonsRun, athleteCount, ageGroups, disciplines, philosophy],
  );

  useEffect(() => {
    if (!user?.id || !hydrated || step === S_DONE) return;
    writeDraftSlot(user.id, DRAFT_SLOT, { ...currentDraft(), stepIndex: step });
  }, [user?.id, hydrated, step, currentDraft]);

  const stepStatus = useMemo<Record<number, StepChipStatus>>(
    () => ({
      [S_WELCOME]: "neutral",
      [S_PROGRAM]: orgName.trim() ? "answered" : "open",
      [S_ROSTER]: ageGroups.length || athleteCount.trim() ? "answered" : "open",
      [S_FOCUS]: disciplines.length ? "answered" : "open",
      [S_ALERTS]: "neutral",
      [S_DONE]: "neutral",
    }),
    [orgName, ageGroups, athleteCount, disciplines],
  );

  const answeredCount = [
    orgName.trim(),
    ageGroups.length || athleteCount.trim(),
    disciplines.length,
  ].filter(Boolean).length;

  const persistToBackend = useCallback(async () => {
    if (!user?.id) return;
    await saveCoachContext(user.id, currentDraft());
  }, [user?.id, currentDraft]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setSaving(true);
    try {
      await persistToBackend();
      if (user?.id) clearDraftSlot(user.id, DRAFT_SLOT);
      setStep(S_DONE);
    } catch (e) {
      toast.error(`Couldn't save your program — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AthleteOnboardingShell
      stepIndex={step}
      steps={STEPS}
      eyebrow="Coach setup"
      title="Set up your program"
      onBack={step > 0 && step < S_DONE ? goBack : undefined}
      onJumpToStep={(i) => i < S_DONE && setStep(i)}
      allowForwardJump
      stepStatus={stepStatus}
      answeredCount={answeredCount}
      totalAnswerable={3}
      onSaveAndExit={persistToBackend}
    >
      {step === S_WELCOME && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Welcome, coach.</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            You won't be asked about your own training — this setup is about
            your program. A minute here shapes your coaching queue, the
            activities you can send, and the athletes you see first.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Roster — the ages and volume you actually coach.
            </li>
            <li className="flex gap-2">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Focus — which disciplines you build plans around.
            </li>
            <li className="flex gap-2">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Alerts — how athlete video and notes reach you.
            </li>
          </ul>
          <div className="flex justify-end">
            <Button onClick={goNext}>
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_PROGRAM && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your program</h2>
          <p className="text-sm text-muted-foreground">
            This shows on notes and assignments you send, so athletes know who
            the guidance came from.
          </p>
          <div className="space-y-1">
            <Label htmlFor="coach-org" className="text-xs">Organization or club</Label>
            <Input
              id="coach-org"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Riverside Baseball Academy"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="coach-program" className="text-xs">Team or program name (optional)</Label>
            <Input
              id="coach-program"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g. 16U National"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="coach-seasons" className="text-xs">Seasons you've run this program (optional)</Label>
            <Input
              id="coach-seasons"
              type="number"
              inputMode="numeric"
              min={0}
              value={seasonsRun}
              onChange={(e) => setSeasonsRun(e.target.value)}
              placeholder="e.g. 4"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>Back</Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_ROSTER && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Who's on your roster?</h2>
          <p className="text-sm text-muted-foreground">
            Age groups keep every drill and standard we surface to you inside
            safe developmental bands.
          </p>
          <ChipMultiSelect
            label="Age groups you coach"
            options={COACH_AGE_GROUPS}
            value={ageGroups}
            onChange={setAgeGroups}
          />
          <div className="space-y-1">
            <Label htmlFor="coach-count" className="text-xs">Roughly how many athletes? (optional)</Label>
            <Input
              id="coach-count"
              type="number"
              inputMode="numeric"
              min={0}
              value={athleteCount}
              onChange={(e) => setAthleteCount(e.target.value)}
              placeholder="e.g. 18"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>Back</Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_FOCUS && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">What do you coach most?</h2>
          <p className="text-sm text-muted-foreground">
            These disciplines lead your drill library and the activities you can
            assign. Nothing is locked — this just sets your default view.
          </p>
          <ChipMultiSelect
            label="Primary disciplines"
            options={COACH_DISCIPLINES}
            value={disciplines}
            onChange={setDisciplines}
          />
          <div className="space-y-1">
            <Label htmlFor="coach-philosophy" className="text-xs">
              Coaching philosophy (optional)
            </Label>
            <Textarea
              id="coach-philosophy"
              value={philosophy}
              onChange={(e) => setPhilosophy(e.target.value)}
              rows={4}
              placeholder="How you want athletes developed — we keep your guidance aligned to it."
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>Back</Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_ALERTS && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">How should your queue reach you?</h2>
          <p className="text-sm text-muted-foreground">
            New athlete video, notes and pending assignments always show in the
            header bell. Email and push are optional.
          </p>
          <NotificationsPreferencesPanel />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>Back</Button>
            <Button onClick={finish} disabled={saving}>
              {saving ? "Saving…" : "Finish setup"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_DONE && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Your program is set.</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your Game Plan card on the dashboard now tracks video reviews, notes
            and pending assignments. Revisit these answers any time from Settings.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/coach-dashboard")}>
              Open coach dashboard
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              Go to my dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </AthleteOnboardingShell>
  );
}
