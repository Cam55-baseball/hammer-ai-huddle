/**
 * ScoutOnboarding — the scout's own first-run experience.
 *
 * This is NOT the athlete flow with fields hidden. A scout never answers
 * training questions. They set up the surfaces they actually work in:
 * who they scout for, where they cover, what they evaluate, and how their
 * review queue reaches them.
 *
 * Answers persist to `scout_context` (canonical) plus notification prefs.
 * Draft state is saved on every step so Save & exit never loses work.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Binoculars, Globe2, ClipboardList, Bell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { AthleteOnboardingShell, StepChipStatus } from "@/components/onboarding/AthleteOnboardingShell";
import { ChipMultiSelect } from "@/components/onboarding/staff/ChipMultiSelect";
import { NotificationsPreferencesPanel } from "@/components/notifications/NotificationsPreferencesPanel";
import { readDraftSlot, writeDraftSlot, clearDraftSlot } from "@/lib/onboarding/draftStore";
import { supabase } from "@/integrations/supabase/client";
import {
  SCOUT_SPORTS,
  SCOUT_REGIONS,
  SCOUT_LEVELS,
  SCOUT_EVALUATION_FOCUS,
  saveScoutContext,
  positiveIntOrNull,
  type ScoutContextDraft,
} from "@/lib/onboarding/staffOnboarding";

const STEPS = ["Welcome", "Organization", "Coverage", "Evaluation", "Alerts", "Done"];
const S_WELCOME = 0;
const S_ORG = 1;
const S_COVERAGE = 2;
const S_EVAL = 3;
const S_ALERTS = 4;
const S_DONE = 5;

const DRAFT_SLOT = "scout-onboarding";

export default function ScoutOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isScout, isCoach, loading: roleLoading } = useScoutAccess();

  const [step, setStep] = useState(S_WELCOME);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [poolSize, setPoolSize] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>([]);

  // Non-scouts don't belong here.
  useEffect(() => {
    if (roleLoading) return;
    if (!isScout) navigate(isCoach ? "/onboarding/coach" : "/dashboard", { replace: true });
  }, [roleLoading, isScout, isCoach, navigate]);

  // Hydrate from saved context first, then any local draft.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: row } = await supabase
          .from("scout_context")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled && row) {
          setOrgName(row.org_name ?? "");
          setPoolSize(row.athlete_pool_size ? String(row.athlete_pool_size) : "");
          setSports(row.sports ?? []);
          setRegions(row.regions ?? []);
          setLevels(row.level_focus ?? []);
          setFocus(row.evaluation_focus ?? []);
        }
        const draft = await readDraftSlot<ScoutContextDraft & { stepIndex?: number }>(
          user.id,
          DRAFT_SLOT,
        );
        if (!cancelled && draft) {
          if (draft.org_name) setOrgName(draft.org_name);
          if (draft.athlete_pool_size != null) setPoolSize(String(draft.athlete_pool_size));
          if (draft.sports?.length) setSports(draft.sports);
          if (draft.regions?.length) setRegions(draft.regions);
          if (draft.level_focus?.length) setLevels(draft.level_focus);
          if (draft.evaluation_focus?.length) setFocus(draft.evaluation_focus);
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
    (): ScoutContextDraft => ({
      org_name: orgName,
      athlete_pool_size: positiveIntOrNull(poolSize),
      sports,
      regions,
      level_focus: levels,
      evaluation_focus: focus,
    }),
    [orgName, poolSize, sports, regions, levels, focus],
  );

  // Persist a draft on every change once hydrated.
  useEffect(() => {
    if (!user?.id || !hydrated || step === S_DONE) return;
    writeDraftSlot(user.id, DRAFT_SLOT, { ...currentDraft(), stepIndex: step });
  }, [user?.id, hydrated, step, currentDraft]);

  const stepStatus = useMemo<Record<number, StepChipStatus>>(
    () => ({
      [S_WELCOME]: "neutral",
      [S_ORG]: orgName.trim() ? "answered" : "open",
      [S_COVERAGE]: sports.length || regions.length || levels.length ? "answered" : "open",
      [S_EVAL]: focus.length ? "answered" : "open",
      [S_ALERTS]: "neutral",
      [S_DONE]: "neutral",
    }),
    [orgName, sports, regions, levels, focus],
  );

  const answeredCount = [orgName.trim(), sports.length || regions.length || levels.length, focus.length].filter(
    Boolean,
  ).length;

  const persistToBackend = useCallback(async () => {
    if (!user?.id) return;
    await saveScoutContext(user.id, currentDraft());
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
      toast.error(`Couldn't save your scout profile — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AthleteOnboardingShell
      stepIndex={step}
      steps={STEPS}
      eyebrow="Scout setup"
      title="Set up your scouting desk"
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
            <Binoculars className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Welcome, scout.</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This setup is built for evaluators, not athletes — you won't be asked
            about your own training. In under a minute we'll shape your review
            queue, your evaluation forms, and the athletes surfaced to you.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Coverage — sports, regions and levels you actually scout.
            </li>
            <li className="flex gap-2">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Evaluation focus — which tools your report cards lead with.
            </li>
            <li className="flex gap-2">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Alerts — how new video and standard matches reach you.
            </li>
          </ul>
          <div className="flex justify-end">
            <Button onClick={goNext}>
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_ORG && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Who do you scout for?</h2>
          <p className="text-sm text-muted-foreground">
            This appears on the evaluations you sign so athletes and families
            know exactly who graded them.
          </p>
          <div className="space-y-1">
            <Label htmlFor="scout-org" className="text-xs">Organization</Label>
            <Input
              id="scout-org"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Northgate Scouting Group, independent"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scout-pool" className="text-xs">Roughly how many athletes do you track? (optional)</Label>
            <Input
              id="scout-pool"
              type="number"
              inputMode="numeric"
              min={0}
              value={poolSize}
              onChange={(e) => setPoolSize(e.target.value)}
              placeholder="e.g. 60"
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

      {step === S_COVERAGE && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Your coverage</h2>
          <p className="text-sm text-muted-foreground">
            We use this to shortlist athletes and to pre-fill recruiting
            standards. Leave anything blank you'd rather not narrow.
          </p>
          <ChipMultiSelect label="Sports" options={SCOUT_SPORTS} value={sports} onChange={setSports} />
          <ChipMultiSelect label="Regions" options={SCOUT_REGIONS} value={regions} onChange={setRegions} />
          <ChipMultiSelect label="Levels" options={SCOUT_LEVELS} value={levels} onChange={setLevels} />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goBack}>Back</Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === S_EVAL && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">What do you evaluate first?</h2>
          <p className="text-sm text-muted-foreground">
            Your report cards open on these tools. You can still grade every
            tool on every report — this only sets the order.
          </p>
          <ChipMultiSelect
            label="Evaluation focus"
            options={SCOUT_EVALUATION_FOCUS}
            value={focus}
            onChange={setFocus}
          />
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
            New video to review and recruiting-standard matches always show in
            the header bell. Email and push are optional.
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
            <h2 className="text-lg font-semibold">Your desk is ready.</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your Game Plan card on the dashboard now tracks unreviewed video and
            pending evaluations. You can revisit these answers any time from Settings.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/scout-dashboard")}>
              Open scout dashboard
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
