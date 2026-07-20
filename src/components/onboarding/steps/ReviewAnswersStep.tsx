/**
 * ReviewAnswersStep — final summary of every onboarding answer.
 *
 * Lets the athlete jump back to any prior step via `?edit=<key>&return=review`.
 * The underlying step components already persist canonically (athlete_context,
 * asb_events, notification_preferences) — this screen just gives the user
 * a durable door back to each answer.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowRight, Pencil, CheckCircle2, AlertCircle, Dumbbell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getV2,
  type CategoryGoalsPayloadV2,
  type DisciplineGoals,
  type SubGoalPick,
} from "@/lib/hammer/goals/categoryGoals";
import {
  findSubGoal,
  type Sport,
  type Discipline,
  type CategoryKey,
} from "@/lib/hammer/goals/subGoalCatalog";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";

export type ReviewEditKey =
  | "profile"
  | "anthropometrics"
  | "goals"
  | "fuel"
  | "mental"
  | "connections"
  | "schedule"
  | "injury"
  | "notifications";

interface Props {
  onEdit: (key: ReviewEditKey) => void;
  onFinish: () => void;
}

function summarizeGoals(payload: CategoryGoalsPayloadV2 | null): string {
  if (!payload) return "Not set yet";
  const parts: string[] = [];
  const panes: [Sport, Discipline, DisciplineGoals | undefined][] = [
    ["baseball", "position", payload.baseball?.position],
    ["baseball", "pitcher", payload.baseball?.pitcher],
    ["softball", "position", payload.softball?.position],
    ["softball", "pitcher", payload.softball?.pitcher],
  ];
  for (const [s, d, dg] of panes) {
    if (!dg) continue;
    const cats: string[] = [];
    for (const cat of ["speed", "power", "hitting", "fielding", "throwing", "pitching"] as CategoryKey[]) {
      const picks = (dg[cat as keyof DisciplineGoals] as ReadonlyArray<SubGoalPick> | undefined) ?? [];
      if (!picks.length) continue;
      const labels = picks
        .map((p) => {
          const base = findSubGoal(s, d, cat, p.id)?.label ?? p.id;
          const sideTag = p.side && p.side !== "both" ? ` [${p.side}]` : "";
          return `${base}${sideTag}`;
        })
        .join(" · ");
      cats.push(`${cat}: ${labels}`);
    }
    if (cats.length) parts.push(`${s}/${d} → ${cats.join(" | ")}`);
  }
  return parts.join("  •  ") || "No sub-goals picked";
}

export function ReviewAnswersStep({ onEdit, onFinish }: Props) {
  const { user } = useAuth();
  const { hasScheduleEvent, hasNotificationsPref, hasCategoryGoals, hasCompletedOnboarding } =
    useAthleteOnboardingState();
  const [email, setEmail] = useState<string>("—");
  const [dob, setDob] = useState<string | null>(null);
  const [throwingHand, setThrowingHand] = useState<string | null>(null);
  const [goals, setGoals] = useState<CategoryGoalsPayloadV2 | null>(null);
  const [latestSchedule, setLatestSchedule] = useState<string | null>(null);
  const [trainingAge, setTrainingAge] = useState<string>("");
  const [isProProspect, setIsProProspect] = useState<boolean>(false);
  const [oneRmSquat, setOneRmSquat] = useState<string>("");
  const [oneRmBench, setOneRmBench] = useState<string>("");
  const [oneRmDl, setOneRmDl] = useState<string>("");
  const [savingTraining, setSavingTraining] = useState(false);


  useEffect(() => {
    if (!user?.id) return;
    setEmail(user.email ?? "—");
    (async () => {
      const [{ data: prof }, { data: ctx }, { data: sched }] = await Promise.all([
        supabase
          .from("profiles")
          .select("date_of_birth, training_age_years, is_pro_prospect, one_rm, throwing_hand")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("athlete_context").select("category_goals").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("asb_events")
          .select("payload, occurred_at")
          .eq("athlete_id", user.id)
          .eq("topic_id", "athlete.schedule.day_type")
          .order("occurred_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const profRow = prof as {
        date_of_birth: string | null;
        training_age_years: number | null;
        is_pro_prospect: boolean | null;
        one_rm: Record<string, number> | null;
        throwing_hand: string | null;
      } | null;
      setDob(profRow?.date_of_birth ?? null);
      setThrowingHand(profRow?.throwing_hand ?? null);

      setTrainingAge(
        profRow?.training_age_years != null ? String(profRow.training_age_years) : "",
      );
      setIsProProspect(!!profRow?.is_pro_prospect);
      const rm = profRow?.one_rm ?? {};
      setOneRmSquat(rm.back_squat != null ? String(rm.back_squat) : "");
      setOneRmBench(rm.bench != null ? String(rm.bench) : "");
      setOneRmDl(rm.deadlift != null ? String(rm.deadlift) : "");
      setGoals(getV2((ctx as { category_goals?: unknown } | null)?.category_goals));
      const payload = (sched as { payload?: { event_type?: string } } | null)?.payload;
      setLatestSchedule(payload?.event_type ?? null);
    })();
  }, [user?.id, user?.email]);

  const saveTrainingInputs = async () => {
    if (!user?.id) return;
    setSavingTraining(true);
    try {
      const oneRm: Record<string, number> = {};
      const parseNum = (s: string) => {
        const n = Number(s);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const sq = parseNum(oneRmSquat);
      const bn = parseNum(oneRmBench);
      const dl = parseNum(oneRmDl);
      if (sq) oneRm.back_squat = sq;
      if (bn) oneRm.bench = bn;
      if (dl) oneRm.deadlift = dl;
      const ageNum = parseNum(trainingAge);
      const { error } = await supabase
        .from("profiles")
        .update({
          training_age_years: ageNum,
          is_pro_prospect: isProProspect,
          one_rm: oneRm,
        } as never)
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Training inputs saved. Hammer will re-dose your next plan.");
    } catch (e) {
      console.error(e);
      toast.error("Could not save training inputs.");
    } finally {
      setSavingTraining(false);
    }
  };

  const rows: Array<{
    label: string;
    value: string;
    editKey: ReviewEditKey | null;
    ok: boolean;
  }> = [
    {
      label: "Account",
      value: email,
      editKey: null,
      ok: !!user?.email,
    },
    {
      label: "Date of birth",
      value: dob ?? "Add in Profile",
      editKey: null,
      ok: !!dob,
    },
    {
      label: "Throwing hand",
      value:
        throwingHand === "L"
          ? "Left"
          : throwingHand === "R"
            ? "Right"
            : throwingHand === "B" || throwingHand === "S"
              ? "Both (ambidextrous)"
              : "Not set",
      editKey: "profile",
      ok: !!throwingHand,
    },
    {
      label: "Today's schedule",
      value: latestSchedule ? latestSchedule : "Not emitted yet",
      editKey: "schedule",
      ok: hasScheduleEvent,
    },

    {
      label: "Ranked sub-goals",
      value: summarizeGoals(goals),
      editKey: "goals",
      ok: hasCategoryGoals,
    },
    {
      label: "Body measurements",
      value: "Edit to review height, weight, wingspan",
      editKey: "anthropometrics",
      ok: true,
    },
    {
      label: "Fuel & recovery",
      value: "Edit to review sleep, hydration, diet",
      editKey: "fuel",
      ok: true,
    },
    {
      label: "Mental & career",
      value: "Edit to review level target and routine",
      editKey: "mental",
      ok: true,
    },
    {
      label: "Connections",
      value: "Edit to invite a parent or link a coach",
      editKey: "connections",
      ok: true,
    },
    {
      label: "Health check",
      value: "Edit to revisit",
      editKey: "injury",
      ok: true,
    },
    {
      label: "Notifications",
      value: hasNotificationsPref ? "Preferences saved" : "Not set",
      editKey: "notifications",
      ok: hasNotificationsPref,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Review your answers</h2>
        <p className="text-sm text-muted-foreground">
          Every answer is editable. Hammer re-plans the moment you save a change.
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {row.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                )}
                {row.label}
              </div>
              <div className="mt-0.5 break-words text-sm text-foreground">{row.value}</div>
            </div>
            {row.editKey && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(row.editKey!)}
                className="shrink-0"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </li>
        ))}
      </ul>

      <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Training inputs (Hammer reads these)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          These directly tune today's Lifts/Speed prescriptions and unlock advanced movement progressions when appropriate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="training-age" className="text-xs">Training age (years of consistent lifting)</Label>
            <Input
              id="training-age"
              type="number"
              min={0}
              step={0.5}
              inputMode="decimal"
              value={trainingAge}
              onChange={(e) => setTrainingAge(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
            <div>
              <Label htmlFor="pro-prospect" className="text-xs">Pro / Prospect</Label>
              <p className="text-[10px] text-muted-foreground">Unlocks advanced library early</p>
            </div>
            <Switch
              id="pro-prospect"
              checked={isProProspect}
              onCheckedChange={setIsProProspect}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="rm-squat" className="text-xs">Back squat 1RM</Label>
            <Input id="rm-squat" type="number" min={0} inputMode="decimal" value={oneRmSquat} onChange={(e) => setOneRmSquat(e.target.value)} placeholder="lbs or kg" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rm-bench" className="text-xs">Bench 1RM</Label>
            <Input id="rm-bench" type="number" min={0} inputMode="decimal" value={oneRmBench} onChange={(e) => setOneRmBench(e.target.value)} placeholder="lbs or kg" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rm-dl" className="text-xs">Deadlift 1RM</Label>
            <Input id="rm-dl" type="number" min={0} inputMode="decimal" value={oneRmDl} onChange={(e) => setOneRmDl(e.target.value)} placeholder="lbs or kg" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={saveTrainingInputs} disabled={savingTraining}>
            {savingTraining ? "Saving…" : "Save training inputs"}
          </Button>
        </div>
      </section>


      {!hasCompletedOnboarding && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
          <Badge variant="outline" className="mr-1.5">Heads up</Badge>
          Some answers are still missing. You can finish later — your progress is saved.
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onFinish}>
          Open Command Center <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
