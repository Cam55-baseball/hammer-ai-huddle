/**
 * Pitcher schedule — starts, rotation, reliever availability and what actually
 * happened. Actual always beats planned; an unconfirmed past outing stays
 * unknown until the athlete answers.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PitcherRole = "starter" | "reliever" | "both";
export interface PitcherSettings { role: PitcherRole; rotation_anchor_date: string | null; rotation_every_days: number | null; rotation_active: boolean }
export interface PitcherOuting { id: string; outing_type: "start" | "relief" | "bullpen"; planned_date: string | null; actual_date: string | null; status: "planned" | "thrown" | "skipped" }
export interface PitcherAvailability { date: string; available: boolean }

export const localIso = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const shiftIso = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const db = supabase as any;

export function usePitcherSchedule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = localIso();
  const key = ["pitcher-schedule", user?.id, today];

  const q = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const [s, o, a] = await Promise.all([
        db.from("pitcher_schedule_settings").select("role, rotation_anchor_date, rotation_every_days, rotation_active").eq("user_id", user!.id).maybeSingle(),
        db.from("pitcher_outings").select("id, outing_type, planned_date, actual_date, status").eq("user_id", user!.id)
          .or(`planned_date.gte.${shiftIso(today, -21)},actual_date.gte.${shiftIso(today, -21)}`).order("planned_date", { ascending: true }).limit(200),
        db.from("pitcher_availability").select("date, available").eq("user_id", user!.id).gte("date", today).lte("date", shiftIso(today, 6)),
      ]);
      for (const r of [s, o, a]) if (r.error) throw r.error;
      return {
        settings: (s.data ?? null) as PitcherSettings | null,
        outings: (o.data ?? []) as PitcherOuting[],
        availability: (a.data ?? []) as PitcherAvailability[],
      };
    },
  });

  const done = () => qc.invalidateQueries({ queryKey: ["pitcher-schedule"] });

  const saveSettings = useMutation({
    mutationFn: async (next: Partial<PitcherSettings>) => {
      const cur = q.data?.settings ?? { role: "starter", rotation_anchor_date: null, rotation_every_days: null, rotation_active: false };
      const { error } = await db.from("pitcher_schedule_settings").upsert({ user_id: user!.id, ...cur, ...next }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: done,
  });

  const planStart = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await db.from("pitcher_outings").insert({ user_id: user!.id, outing_type: "start", planned_date: date, status: "planned" });
      if (error) throw error;
    },
    onSuccess: done,
  });

  /** Record what actually happened. `actualDate` null with thrown=false = didn't pitch. */
  const resolveOuting = useMutation({
    mutationFn: async (v: { id: string; thrown: boolean; actualDate: string | null }) => {
      const { error } = await db.from("pitcher_outings")
        .update(v.thrown ? { status: "thrown", actual_date: v.actualDate } : { status: "skipped", actual_date: null })
        .eq("id", v.id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  /** "I threw today" — a real outing on its real date. */
  const threwToday = useMutation({
    mutationFn: async (type: "start" | "relief" | "bullpen") => {
      // If a start was planned for today, confirm it instead of adding a second row.
      const planned = (q.data?.outings ?? []).find((o) => o.status === "planned" && o.planned_date === today);
      const { error } = planned
        ? await db.from("pitcher_outings").update({ status: "thrown", actual_date: today, outing_type: type }).eq("id", planned.id).eq("user_id", user!.id)
        : await db.from("pitcher_outings").insert({ user_id: user!.id, outing_type: type, actual_date: today, status: "thrown" });
      if (error) throw error;
    },
    onSuccess: done,
  });

  const setAvailable = useMutation({
    mutationFn: async (v: { date: string; available: boolean | null }) => {
      const { error } = v.available === null
        ? await db.from("pitcher_availability").delete().eq("user_id", user!.id).eq("date", v.date)
        : await db.from("pitcher_availability").upsert({ user_id: user!.id, date: v.date, available: v.available }, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onSuccess: done,
  });

  const unconfirmed = (q.data?.outings ?? []).filter((o) => o.status === "planned" && o.planned_date && o.planned_date < today);
  const upcoming = (q.data?.outings ?? []).filter((o) => o.status === "planned" && o.planned_date && o.planned_date >= today);

  return { ...q, today, unconfirmed, upcoming, saveSettings, planStart, resolveOuting, threwToday, setAvailable };
}
