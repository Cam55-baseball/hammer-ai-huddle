import { supabase } from "@/integrations/supabase/client";
import { judgeRestMove, restDateFor, mondayOf, type RestChoice } from "../../../supabase/functions/_shared/wic/schedule/restDay";

export async function readRestChoices(userId: string): Promise<RestChoice[]> {
  const { data, error } = await (supabase as any).from("rest_day_choices")
    .select("rest_dow,scope,week_start,created_at,undone_at").eq("user_id", userId).is("undone_at", null).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as RestChoice[];
}

/** True when this week's rest day has already been used (date passed, or today and done). */
export function restUsedThisWeek(today: string, choices: RestChoice[], todayRestDone = false): boolean {
  const current = restDateFor(today, choices);
  return current < today || (current === today && todayRestDone);
}

/**
 * Owner Nov 1 B1/B2: save the chosen rest day, then the caller rebuilds the week
 * through the same server builder (announceChange). Returns the verdict.
 */
export async function chooseRestDay(i: {
  userId: string; today: string; target: string; scope: "week" | "indefinite";
  source: "calendar" | "check_in"; todayRestDone?: boolean;
}): Promise<{ ok: true; restDate: string; weekStart: string } | { ok: false; reason: string }> {
  const choices = await readRestChoices(i.userId);
  const verdict = judgeRestMove({ today: i.today, target: i.target, scope: i.scope, choices, todayRestDone: i.todayRestDone });
  if (!verdict.ok) return verdict;
  const dow = new Date(`${i.target}T12:00:00Z`).getUTCDay();
  const { error } = await (supabase as any).from("rest_day_choices").insert({
    user_id: i.userId, rest_dow: dow, scope: i.scope, week_start: verdict.weekStart, source: i.source,
  });
  if (error) return { ok: false, reason: "Your rest day wasn't saved. Try again." };
  return { ok: true, restDate: verdict.restDate, weekStart: verdict.weekStart };
}

export { mondayOf };
