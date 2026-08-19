/**
 * Scheduled priority tasks for Hammers Today.
 *
 * Surfaces the periodic, cycle-driven items (6-week recap, progress photos,
 * performance re-tests, scout self-grades, weekly wellness goals) that already
 * govern the Game Plan, so they appear at the very top of the daily plan on the
 * exact day they come due. Read-only: no writes, no new cadence authority —
 * the cadence columns (`next_entry_date`, `next_prompt_date`) and
 * `useRecapCountdown` remain the single source of truth.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useRecapCountdown } from "@/hooks/useRecapCountdown";
import { getVaultSectionUrl, getVaultRecapUrl } from "@/utils/vaultNavigation";
import { startOfWeek, format } from "date-fns";
import { Camera, Activity, Star, Target, FileText, type LucideIcon } from "lucide-react";

export interface ScheduledPriorityTask {
  id: string;
  title: string;
  detail: string;
  cadence: string;
  link: string;
  icon: LucideIcon;
  /** Overdue items sort first and read as "Overdue". */
  overdue: boolean;
}

function isDue(nextDate: string | null | undefined, hasHistory: boolean): boolean {
  if (!hasHistory) return true;
  if (!nextDate) return true;
  return new Date(nextDate) <= new Date();
}

function daysPast(nextDate: string | null | undefined): number {
  if (!nextDate) return 0;
  const diff = Date.now() - new Date(nextDate).getTime();
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

export function useScheduledPriorityTasks() {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const recap = useRecapCountdown();

  const hasPitching = modules.includes("pitching");
  const hasHitting = modules.includes("hitting");
  const hasThrowing = modules.includes("throwing");

  const { data, isLoading } = useQuery({
    queryKey: ["hammer-scheduled-priority", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const uid = user!.id;
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

      const [perf, photos, grades, pitchGrades, wellness] = await Promise.all([
        supabase
          .from("vault_performance_tests")
          .select("next_entry_date")
          .eq("user_id", uid)
          .order("test_date", { ascending: false })
          .limit(1),
        supabase
          .from("vault_progress_photos")
          .select("next_entry_date")
          .eq("user_id", uid)
          .order("photo_date", { ascending: false })
          .limit(1),
        supabase
          .from("vault_scout_grades")
          .select("next_prompt_date")
          .eq("user_id", uid)
          .eq("grade_type", "hitting_throwing")
          .order("graded_at", { ascending: false })
          .limit(1),
        supabase
          .from("vault_scout_grades")
          .select("next_prompt_date")
          .eq("user_id", uid)
          .eq("grade_type", "pitching")
          .order("graded_at", { ascending: false })
          .limit(1),
        supabase
          .from("vault_weekly_wellness_quiz")
          .select("id")
          .eq("user_id", uid)
          .eq("week_start_date", weekStart)
          .maybeSingle(),
      ]);

      return {
        perfNext: perf.data?.[0]?.next_entry_date ?? null,
        perfHistory: (perf.data?.length ?? 0) > 0,
        photoNext: photos.data?.[0]?.next_entry_date ?? null,
        photoHistory: (photos.data?.length ?? 0) > 0,
        gradeNext: grades.data?.[0]?.next_prompt_date ?? null,
        gradeHistory: (grades.data?.length ?? 0) > 0,
        pitchGradeNext: pitchGrades.data?.[0]?.next_prompt_date ?? null,
        pitchGradeHistory: (pitchGrades.data?.length ?? 0) > 0,
        wellnessDone: !!wellness.data,
      };
    },
  });

  const tasks = useMemo<ScheduledPriorityTask[]>(() => {
    if (!data) return [];
    const out: ScheduledPriorityTask[] = [];

    if (recap.canGenerateRecap || recap.hasMissedRecap) {
      out.push({
        id: "recap",
        title: "Generate your 6-week recap",
        detail: recap.hasMissedRecap
          ? "Last cycle closed without a recap — build it now to keep your history unbroken."
          : "Your 42-day cycle just closed. Lock in what changed.",
        cadence: "Every 6 weeks",
        link: getVaultRecapUrl(),
        icon: FileText,
        overdue: recap.hasMissedRecap,
      });
    }

    if (isDue(data.photoNext, data.photoHistory)) {
      out.push({
        id: "photos",
        title: "Take progress photos",
        detail: "Front, side, back — same light, same spot.",
        cadence: "Every 6 weeks",
        link: getVaultSectionUrl("progress-photos"),
        icon: Camera,
        overdue: daysPast(data.photoNext) > 3,
      });
    }

    if (isDue(data.perfNext, data.perfHistory)) {
      out.push({
        id: "performance",
        title: "Re-test your performance numbers",
        detail: "Beat your last marks — the plan re-scales off these results.",
        cadence: "Every 6 weeks",
        link: getVaultSectionUrl("performance-tests"),
        icon: Activity,
        overdue: daysPast(data.perfNext) > 3,
      });
    }

    if ((hasHitting || hasThrowing) && isDue(data.gradeNext, data.gradeHistory)) {
      out.push({
        id: "grades",
        title: "Scout self-grades — hitting & throwing",
        detail: "Grade yourself honestly. Hammer compares it to your reps.",
        cadence: "Every 12 weeks",
        link: getVaultSectionUrl("scout-grades"),
        icon: Star,
        overdue: daysPast(data.gradeNext) > 7,
      });
    }

    if (hasPitching && isDue(data.pitchGradeNext, data.pitchGradeHistory)) {
      out.push({
        id: "pitching-grades",
        title: "Scout self-grades — pitching",
        detail: "Arsenal, command, competitiveness — score the last 12 weeks.",
        cadence: "Every 12 weeks",
        link: getVaultSectionUrl("pitching-grades"),
        icon: Star,
        overdue: daysPast(data.pitchGradeNext) > 7,
      });
    }

    if (!data.wellnessDone) {
      out.push({
        id: "wellness-goals",
        title: "Set this week's wellness goals",
        detail: "Two minutes. Sets your recovery targets for the next seven days.",
        cadence: "Weekly",
        link: getVaultSectionUrl("wellness-goals"),
        icon: Target,
        overdue: false,
      });
    }

    return out.sort((a, b) => Number(b.overdue) - Number(a.overdue));
  }, [data, recap.canGenerateRecap, recap.hasMissedRecap, hasHitting, hasThrowing, hasPitching]);

  return { tasks, loading: isLoading || recap.loading };
}
