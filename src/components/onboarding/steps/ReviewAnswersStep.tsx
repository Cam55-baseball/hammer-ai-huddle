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
import { ArrowRight, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
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
  | "goals"
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
        .map((p) => findSubGoal(s, d, cat, p.id)?.label ?? p.id)
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
  const [goals, setGoals] = useState<CategoryGoalsPayloadV2 | null>(null);
  const [latestSchedule, setLatestSchedule] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setEmail(user.email ?? "—");
    (async () => {
      const [{ data: prof }, { data: ctx }, { data: sched }] = await Promise.all([
        supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle(),
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
      setDob((prof as { date_of_birth: string | null } | null)?.date_of_birth ?? null);
      setGoals(getV2((ctx as { category_goals?: unknown } | null)?.category_goals));
      const payload = (sched as { payload?: { event_type?: string } } | null)?.payload;
      setLatestSchedule(payload?.event_type ?? null);
    })();
  }, [user?.id, user?.email]);

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
