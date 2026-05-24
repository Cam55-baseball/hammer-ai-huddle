import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  certify,
  computeReDerivedState,
  type CertificationResult,
  type JsonObject,
  type ReDerivationResult,
  type ReplayInput,
} from "@/lib/asb/replay";

/**
 * G2 — composes raw lineage + raw self event + raw snapshot rows into a
 * read-only replay certification verdict. All inputs come from the existing
 * RLS-scoped ASB tables. No writes, no mutations.
 */

const COLS_EVENT =
  "event_id, athlete_id, topic_id, actor_role, occurred_at, payload, engine_version";

interface SelectedEventRow {
  event_id: string;
  athlete_id: string;
  topic_id: string;
  actor_role: string;
  occurred_at: string;
  payload: JsonObject;
  engine_version: string;
}

export interface ReplayCertificationData {
  selectedEvent: SelectedEventRow;
  ancestorEvents: SelectedEventRow[]; // ordered by lineage created_at asc
  snapshot: {
    snapshot_id: string;
    snapshot_kind: string;
    engine_version: string;
    payload: JsonObject;
    created_at: string;
  } | null;
  reDerivation: ReDerivationResult;
  certification: CertificationResult;
  engineVersionInRegistry: boolean;
}

/**
 * Step 1: fetch the selected event so its engine_version can participate in
 * the certification query key (engine_version-safe invalidation per RE-1…RE-10).
 */
function useSelectedEvent(eventId: string | null) {
  return useQuery({
    queryKey: ["asb-replay-selected-event", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<SelectedEventRow> => {
      const { data, error } = await supabase
        .from("asb_events")
        .select(COLS_EVENT)
        .eq("event_id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Event not found or not visible under RLS.");
      return data as SelectedEventRow;
    },
  });
}

export function useReplayCertification(eventId: string | null) {
  const selectedQuery = useSelectedEvent(eventId);
  const selected = selectedQuery.data ?? null;
  const eventEngineVersion = selected?.engine_version ?? null;

  const certQuery = useQuery({
    queryKey: ["asb-replay-certification", eventId, eventEngineVersion],
    enabled: !!eventId && !!selected,
    queryFn: async (): Promise<ReplayCertificationData> => {
      const selectedEvent = selected!;

      // 2. Single-hop ancestor lineage edges — deterministic ordering
      // (created_at, parent_event_id) so same-tx inserts have a stable tiebreak.
      const { data: edges, error: edgesErr } = await supabase
        .from("asb_event_lineage")
        .select("parent_event_id, created_at")
        .eq("child_event_id", eventId!)
        .order("created_at", { ascending: true })
        .order("parent_event_id", { ascending: true })
        .limit(500);
      if (edgesErr) throw edgesErr;

      // 3. Ancestor events (preserving lineage order)
      const parentIds = (edges ?? []).map((e: any) => e.parent_event_id as string);
      let ancestorRows: SelectedEventRow[] = [];
      if (parentIds.length > 0) {
        const { data: parents, error: pErr } = await supabase
          .from("asb_events")
          .select(COLS_EVENT)
          .in("event_id", parentIds);
        if (pErr) throw pErr;
        const byId = new Map<string, SelectedEventRow>();
        for (const p of (parents ?? []) as SelectedEventRow[]) byId.set(p.event_id, p);
        ancestorRows = parentIds
          .map((id) => byId.get(id))
          .filter((r): r is SelectedEventRow => !!r);
      }

      // 4. Snapshot as_of this event (engine-version matched if present)
      const { data: snapRows, error: snapErr } = await supabase
        .from("asb_state_snapshots")
        .select("snapshot_id, snapshot_kind, engine_version, payload, created_at")
        .eq("as_of_event_id", eventId!)
        .order("created_at", { ascending: false });
      if (snapErr) throw snapErr;
      const snapshot = (() => {
        const all = (snapRows ?? []) as Array<{
          snapshot_id: string;
          snapshot_kind: string;
          engine_version: string;
          payload: JsonObject;
          created_at: string;
        }>;
        if (all.length === 0) return null;
        return (
          all.find((s) => s.engine_version === selectedEvent.engine_version) ?? all[0]
        );
      })();

      // 5. Engine version registry presence
      const { data: ev, error: evErr } = await supabase
        .from("asb_engine_versions")
        .select("engine_version")
        .eq("engine_version", selectedEvent.engine_version)
        .maybeSingle();
      if (evErr) throw evErr;
      const engineVersionInRegistry = !!ev;

      // 6. Deterministic re-derivation
      const chain: ReplayInput[] = [
        ...ancestorRows.map((a) => ({ event_id: a.event_id, payload: a.payload })),
        { event_id: selectedEvent.event_id, payload: selectedEvent.payload },
      ];
      const reDerivation = computeReDerivedState(chain, selectedEvent.engine_version);

      // 7. Certification verdict
      const certification = certify({
        snapshotPayload: snapshot?.payload ?? null,
        reDerivedPayload: reDerivation.projection,
        snapshotEngineVersion: snapshot?.engine_version ?? null,
        eventEngineVersion: selectedEvent.engine_version,
        chainLength: chain.length,
        hasEngineVersionInRegistry: engineVersionInRegistry,
      });

      return {
        selectedEvent,
        ancestorEvents: ancestorRows,
        snapshot,
        reDerivation,
        certification,
        engineVersionInRegistry,
      };
    },
  });

  // Preserve hook surface: merge loading/error from the prerequisite query.
  if (selectedQuery.isLoading || (!!eventId && !selected && !selectedQuery.error)) {
    return { ...certQuery, isLoading: true, data: undefined, error: null as any };
  }
  if (selectedQuery.error) {
    return { ...certQuery, isLoading: false, data: undefined, error: selectedQuery.error };
  }
  return certQuery;
}
