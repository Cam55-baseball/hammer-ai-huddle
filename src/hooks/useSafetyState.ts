/**
 * Phase D — hook over safetyState projection.
 */
import { useEffect, useMemo, useState } from "react";
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import {
  safetyState,
  type SafeguardingStatusRow,
  type SafetyStatus,
} from "@/lib/runtime/projections/safeguardingNotifications";
import { supabase } from "@/integrations/supabase/client";

export function useSafetyState(athleteId: string) {
  const q = useAsbTimeline({ athleteId });
  const rows = q.data?.rows;
  const dev = useDevelopmentalState(athleteId, "self");
  const isMinor = Boolean((dev.state as { is_minor?: boolean })?.is_minor);

  const [statusRows, setStatusRows] = useState<SafeguardingStatusRow[]>([]);
  const [version, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!athleteId) return;
      const { data, error } = await supabase
        .from("safeguarding_notifications")
        .select("source_event_id, route, status, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn("[safety] status fetch failed", error);
        setStatusRows([]);
        return;
      }
      // Latest status per (source_event_id, route).
      const seen = new Map<string, SafeguardingStatusRow>();
      for (const r of (data ?? []) as Array<{
        source_event_id: string;
        route: string;
        status: SafetyStatus;
      }>) {
        const k = `${r.source_event_id}::${r.route}`;
        if (!seen.has(k)) seen.set(k, r);
      }
      setStatusRows(Array.from(seen.values()));
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId, version]);

  const projection = useMemo(
    () => safetyState(rows, "self", { is_minor: isMinor, statusRows }),
    [rows, isMinor, statusRows],
  );

  async function setStatus(
    source_event_id: string,
    route: string,
    status: SafetyStatus,
  ) {
    if (!athleteId) return;
    await supabase.from("safeguarding_notifications").insert({
      athlete_id: athleteId,
      source_event_id,
      route,
      status,
      reasons: [],
    });
    bump((v) => v + 1);
  }

  return {
    state: projection.state,
    meta: projection.meta,
    loading: q.isLoading,
    setStatus,
  };
}
