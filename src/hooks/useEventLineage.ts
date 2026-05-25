import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Defensive cap on lineage edges per direction. Single-hop traversal only. */
const EDGE_CAP_PER_DIRECTION = 500;

export interface LineageEdge {
  lineage_id: string;
  parent_event_id: string;
  child_event_id: string;
  derivation_type: string;
  engine_version: string;
  created_at: string;
}

function dedupeEdges(rows: LineageEdge[]): LineageEdge[] {
  const seen = new Set<string>();
  const out: LineageEdge[] = [];
  for (const e of rows) {
    if (seen.has(e.lineage_id)) continue;
    seen.add(e.lineage_id);
    out.push(e);
  }
  return out;
}

/**
 * Single-hop lineage: ancestors (this event is child) + descendants (this event is parent).
 * No recursion, no graph traversal — raw edges only.
 */
export function useEventLineage(eventId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["asb-event-lineage", eventId],
    enabled: !!eventId && enabled,
    queryFn: async (): Promise<{ ancestors: LineageEdge[]; descendants: LineageEdge[] }> => {
      const cols =
        "lineage_id, parent_event_id, child_event_id, derivation_type, engine_version, created_at";
      const [{ data: ancestors, error: aErr }, { data: descendants, error: dErr }] =
        await Promise.all([
          supabase
            .from("asb_event_lineage")
            .select(cols)
            .eq("child_event_id", eventId!)
            .order("created_at", { ascending: true })
            .order("parent_event_id", { ascending: true })
            .limit(EDGE_CAP_PER_DIRECTION),
          supabase
            .from("asb_event_lineage")
            .select(cols)
            .eq("parent_event_id", eventId!)
            .order("created_at", { ascending: true })
            .order("child_event_id", { ascending: true })
            .limit(EDGE_CAP_PER_DIRECTION),
        ]);
      if (aErr) throw aErr;
      if (dErr) throw dErr;
      return {
        ancestors: dedupeEdges((ancestors ?? []) as LineageEdge[]),
        descendants: dedupeEdges((descendants ?? []) as LineageEdge[]),
      };
    },
  });
}

export interface StateSnapshotRow {
  snapshot_id: string;
  athlete_id: string;
  snapshot_kind: string;
  as_of_event_id: string;
  engine_version: string;
  payload: Record<string, unknown>;
  created_at: string;
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
  schema_version: number;
  released_at: string;
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
