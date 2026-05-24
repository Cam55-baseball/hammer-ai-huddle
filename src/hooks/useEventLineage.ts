import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LineageEdge {
  lineage_id: string;
  parent_event_id: string | null;
  child_event_id: string | null;
  derivation_type: string | null;
  engine_version: string | null;
  created_at: string | null;
}

/**
 * Fetch the lineage edges where this event is a child (its ancestors)
 * and where it is a parent (its descendants). No aggregation — raw edges.
 */
export function useEventLineage(eventId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["asb-event-lineage", eventId],
    enabled: !!eventId && enabled,
    queryFn: async (): Promise<{ ancestors: LineageEdge[]; descendants: LineageEdge[] }> => {
      const [{ data: ancestors, error: aErr }, { data: descendants, error: dErr }] =
        await Promise.all([
          supabase
            .from("asb_event_lineage")
            .select("lineage_id, parent_event_id, child_event_id, derivation_type, engine_version, created_at")
            .eq("child_event_id", eventId!)
            .order("created_at", { ascending: true }),
          supabase
            .from("asb_event_lineage")
            .select("lineage_id, parent_event_id, child_event_id, derivation_type, engine_version, created_at")
            .eq("parent_event_id", eventId!)
            .order("created_at", { ascending: true }),
        ]);
      if (aErr) throw aErr;
      if (dErr) throw dErr;
      return {
        ancestors: (ancestors ?? []) as LineageEdge[],
        descendants: (descendants ?? []) as LineageEdge[],
      };
    },
  });
}

export interface StateSnapshotRow {
  snapshot_id: string;
  athlete_id: string;
  snapshot_kind: string | null;
  as_of_event_id: string | null;
  engine_version: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
}

export function useStateSnapshotForEvent(eventId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["asb-state-snapshot-for-event", eventId],
    enabled: !!eventId && enabled,
    queryFn: async (): Promise<StateSnapshotRow[]> => {
      const { data, error } = await supabase
        .from("asb_state_snapshots")
        .select("snapshot_id, athlete_id, snapshot_kind, as_of_event_id, engine_version, payload, created_at")
        .eq("as_of_event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StateSnapshotRow[];
    },
  });
}

export interface EngineVersionRow {
  engine_version: string;
  schema_version: number | null;
  released_at: string | null;
  deprecated_at: string | null;
  notes: string | null;
}

export function useEngineVersion(engineVersion: string | null) {
  return useQuery({
    queryKey: ["asb-engine-version", engineVersion],
    enabled: !!engineVersion,
    queryFn: async (): Promise<EngineVersionRow | null> => {
      const { data, error } = await supabase
        .from("asb_engine_versions")
        .select("engine_version, schema_version, released_at, deprecated_at, notes")
        .eq("engine_version", engineVersion!)
        .maybeSingle();
      if (error) throw error;
      return (data as EngineVersionRow | null) ?? null;
    },
  });
}
