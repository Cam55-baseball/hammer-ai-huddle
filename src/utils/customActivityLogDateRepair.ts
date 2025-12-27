import { supabase } from "@/integrations/supabase/client";
import { getLocalDateString, getTodayDate } from "@/utils/dateUtils";

type RepairResult = { ran: boolean; updated: number; merged: number };

type CustomActivityLogRow = {
  id: string;
  template_id: string | null;
  entry_date: string;
  completed: boolean | null;
  completed_at: string | null;
  created_at: string | null;
  notes: string | null;
  performance_data: unknown;
  actual_duration_minutes: number | null;
  reminder_minutes: number | null;
  sort_order: number | null;
  start_time: string | null;
};

const epochDay = (dateString: string): number => {
  const [y, m, d] = dateString.split("-").map((n) => Number(n));
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
};

const dayDiff = (a: string, b: string) => epochDay(a) - epochDay(b);

const repairKey = (userId: string) => `customActivityLogDateRepair:v1:${userId}`;

export async function repairRecentCustomActivityLogDatesOncePerDay(
  userId: string,
  lookbackDays: number = 7
): Promise<RepairResult> {
  const today = getTodayDate();

  try {
    const last = localStorage.getItem(repairKey(userId));
    if (last === today) return { ran: false, updated: 0, merged: 0 };
  } catch {
    // Ignore storage errors (private browsing, blocked storage, etc.)
  }

  const { updated, merged } = await repairRecentCustomActivityLogDates(userId, lookbackDays);

  try {
    localStorage.setItem(repairKey(userId), today);
  } catch {
    // Ignore
  }

  return { ran: true, updated, merged };
}

export async function repairRecentCustomActivityLogDates(
  userId: string,
  lookbackDays: number = 7
): Promise<{ updated: number; merged: number }> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const sinceIso = since.toISOString();

  const { data, error } = await supabase
    .from("custom_activity_logs")
    .select(
      "id, template_id, entry_date, completed, completed_at, created_at, notes, performance_data, actual_duration_minutes, reminder_minutes, sort_order, start_time"
    )
    .eq("user_id", userId)
    .or(`created_at.gte.${sinceIso},completed_at.gte.${sinceIso}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  let updated = 0;
  let merged = 0;

  for (const log of (data || []) as unknown as CustomActivityLogRow[]) {
    if (!log.template_id) continue;

    const referenceIso = log.completed_at ?? log.created_at;
    if (!referenceIso) continue;

    const expectedEntryDate = getLocalDateString(new Date(referenceIso));
    if (expectedEntryDate === log.entry_date) continue;

    // Only auto-fix the classic legacy bug: date shifted by exactly 1 day.
    const diff = dayDiff(log.entry_date, expectedEntryDate);
    if (Math.abs(diff) !== 1) continue;

    // If a correct-day row already exists, merge into it and delete the shifted row.
    const { data: existing, error: existingError } = await supabase
      .from("custom_activity_logs")
      .select(
        "id, completed, completed_at, notes, performance_data, actual_duration_minutes, reminder_minutes, sort_order, start_time"
      )
      .eq("user_id", userId)
      .eq("template_id", log.template_id)
      .eq("entry_date", expectedEntryDate)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing && (existing as any).id && (existing as any).id !== log.id) {
      const ex = existing as any;

      const mergedUpdate: Record<string, unknown> = {
        completed: Boolean(ex.completed) || Boolean(log.completed),
        completed_at: (ex.completed_at as string | null) ?? log.completed_at,
        notes: (ex.notes as string | null) ?? log.notes,
        performance_data: (ex.performance_data as unknown) ?? log.performance_data,
        actual_duration_minutes:
          (ex.actual_duration_minutes as number | null) ?? log.actual_duration_minutes,
        reminder_minutes: (ex.reminder_minutes as number | null) ?? log.reminder_minutes,
        sort_order: (ex.sort_order as number | null) ?? log.sort_order,
        start_time: (ex.start_time as string | null) ?? log.start_time,
      };

      const { error: mergeUpdateError } = await supabase
        .from("custom_activity_logs")
        .update(mergedUpdate)
        .eq("id", ex.id)
        .eq("user_id", userId);

      if (mergeUpdateError) throw mergeUpdateError;

      const { error: deleteError } = await supabase
        .from("custom_activity_logs")
        .delete()
        .eq("id", log.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      merged += 1;
    } else {
      const { error: updateError } = await supabase
        .from("custom_activity_logs")
        .update({ entry_date: expectedEntryDate })
        .eq("id", log.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      updated += 1;
    }
  }

  return { updated, merged };
}
