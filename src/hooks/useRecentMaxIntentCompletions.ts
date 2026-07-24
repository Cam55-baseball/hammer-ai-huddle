/**
 * useRecentMaxIntentCompletions — feeds the roadmap recovery clock
 * (24/48/72/96h) with real timestamps from `hammer_daily_task_completions`.
 *
 * Rules (safety-first, deterministic):
 *   - Only prescription-level completions count as max-intent attempts.
 *     Block-drill toggles are technique work and never trip the clock.
 *   - Modality is inferred from the task_id prefix (`modality:slug`) OR
 *     from `payload.modality`.
 *   - Side (L/R) is preserved so switch-hitters / ambidextrous throwers
 *     don't have one arm gate the other.
 *   - Lookback is 5 days — the longest recovery window is 96h ≈ 4d, plus
 *     one buffer day.
 *
 * Interpretive read-only. Never authors organism truth.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  CompletionRecord,
  RecoveryModality,
} from "@/lib/hammer/roadmap/recoveryWindows";

const MODALITY_MAP: Record<string, RecoveryModality> = {
  strength: "heavy_lift",
  lifts:    "heavy_lift",
  lift:     "heavy_lift",
  speed:    "max_velocity",
  sprint:   "max_velocity",
  hitting:  "bat_speed_max",
  bat:      "bat_speed_max",
  bat_speed:"bat_speed_max",
  throwing: "throwing_max",
  throw:    "throwing_max",
  eass:     "throwing_max",
};

interface Row {
  task_id: string | null;
  source: string | null;
  side: "L" | "R" | null;
  completed: boolean | null;
  completed_at: string | null;
  payload: Record<string, unknown> | null;
}

function inferModality(row: Row): RecoveryModality | null {
  const payloadMod =
    typeof row.payload?.modality === "string" ? (row.payload.modality as string).toLowerCase() : null;
  if (payloadMod && MODALITY_MAP[payloadMod]) return MODALITY_MAP[payloadMod];
  const prefix = (row.task_id ?? "").split(":")[0]?.toLowerCase() ?? "";
  return MODALITY_MAP[prefix] ?? null;
}

export function useRecentMaxIntentCompletions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recent-max-intent-completions", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<ReadonlyArray<CompletionRecord>> => {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 5);
      const { data, error } = await supabase
        .from("hammer_daily_task_completions" as unknown as never)
        .select("task_id, source, side, completed, completed_at, payload")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .gte("completed_at", since.toISOString());
      if (error) throw error;
      const rows = ((data ?? []) as unknown as Row[]).filter(
        (r) => r.source === "wk_prescription" && !!r.completed_at,
      );
      const out: CompletionRecord[] = [];
      for (const r of rows) {
        const mod = inferModality(r);
        if (!mod) continue;
        out.push({
          modality: mod,
          at: new Date(r.completed_at as string),
          side: (r.side ?? null) as CompletionRecord["side"],
        });
      }
      return out;
    },
  });
}
