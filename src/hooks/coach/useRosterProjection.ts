import { useMemo } from "react";
import { useCoachRoster } from "./useCoachRoster";
import { useCoachRosterRows } from "./useCoachRosterRows";
import {
  bucketByAthlete,
  snapshotAthlete,
  escalationsFromRows,
  missingSignalsFromBuckets,
  workloadContinuityFromBuckets,
} from "@/lib/coach/projections";

/**
 * One-call read-only roster projection.
 * Single asb_events SELECT fans out into all coach console surfaces.
 */
export function useRosterProjection() {
  const rosterQ = useCoachRoster();
  const athleteIds = useMemo(
    () => (rosterQ.data ?? []).map((a) => a.athleteId),
    [rosterQ.data],
  );
  const rowsQ = useCoachRosterRows(athleteIds, { days: 14, limit: 2000 });

  const projection = useMemo(() => {
    const buckets = bucketByAthlete(rowsQ.data ?? []);
    const snapshots = athleteIds.map((id) => snapshotAthlete(id, buckets.get(id) ?? []));
    const escalations = escalationsFromRows(rowsQ.data ?? []);
    const missing = missingSignalsFromBuckets(buckets, athleteIds);
    const workload = workloadContinuityFromBuckets(buckets, athleteIds);
    return { buckets, snapshots, escalations, missing, workload };
  }, [rowsQ.data, athleteIds]);

  return {
    roster: rosterQ.data ?? [],
    ...projection,
    isLoading: rosterQ.isLoading || rowsQ.isLoading,
    error: rosterQ.error ?? rowsQ.error ?? null,
  };
}
