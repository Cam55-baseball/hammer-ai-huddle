# G2 Determinism Fixes (scoped, no refactors)

Only `src/hooks/useReplayCertification.ts` changes. No other files touched. No schema, no migrations, no API changes to consumers (`AsbReplay.tsx` continues to call `useReplayCertification(eventId)`).

## Fix 1 — Stable lineage ordering

In the `asb_event_lineage` query, add `parent_event_id` as a deterministic secondary sort. Single-hop logic and 500-row cap unchanged.

```ts
.from("asb_event_lineage")
.select("parent_event_id, created_at")
.eq("child_event_id", eventId!)
.order("created_at", { ascending: true })
.order("parent_event_id", { ascending: true })   // NEW: stable tiebreak
.limit(500);
```

Effect: same-transaction lineage inserts (identical `created_at`) now produce a fully deterministic chain order → identical re-derived projection across reads.

## Fix 2 — Engine-version-keyed cache (two-step query)

Split into two `useQuery` calls inside the same hook; the outer return surface is preserved.

```ts
function useSelectedEvent(eventId: string | null) {
  return useQuery({
    queryKey: ["asb-replay-selected-event", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<SelectedEventRow> => {
      const { data, error } = await supabase
        .from("asb_events").select(COLS_EVENT)
        .eq("event_id", eventId!).maybeSingle();
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
    queryKey: ["asb-replay-certification", eventId, eventEngineVersion], // engine_version-safe
    enabled: !!eventId && !!selected,
    queryFn: async (): Promise<ReplayCertificationData> => {
      const selectedEvent = selected!;
      // ... steps 2–7 unchanged (lineage with new tiebreak, ancestors, snapshot,
      //     registry presence, computeReDerivedState, certify)
      return { selectedEvent, ancestorEvents, snapshot, reDerivation, certification, engineVersionInRegistry };
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
```

Effect: certification cache key participates in `engine_version`. A change in the event's pinned `engine_version` (or registry presence resolved on a later read) cannot be masked by a stale cache entry.

## Constraints honored

- No new files, no new abstractions, no new patterns.
- Hook public signature unchanged: `useReplayCertification(eventId)`.
- Single-hop lineage rule unchanged; no recursion introduced.
- No changes to `replay.ts`, `StateDiffView.tsx`, `ReplayCertificationPanel.tsx`, `ReplayInputChain.tsx`, `AsbReplay.tsx`, `EventCard.tsx`, or `App.tsx`.

## Post-fix confirmation

- **Deterministic under identical inputs**: lineage order now fully total (created_at, parent_event_id), `computeReDerivedState` already pure → identical projection every run.
- **Engine_version-safe invalidation**: cache key tuple includes `eventEngineVersion`.
- **Stable ordering under edge-case inserts**: same-`created_at` parent edges resolved deterministically by `parent_event_id`.

Then proceed to G5.
