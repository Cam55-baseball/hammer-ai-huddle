/**
 * Phase 152/153/154 — read-only hooks over relational projections.
 * UI components consume these; no component holds relational state locally.
 */
import { useMemo } from "react";
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import type { Scope } from "@/lib/runtime/projections/types";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import { psychState } from "@/lib/runtime/projections/psychState";
import { developmentalState } from "@/lib/runtime/projections/developmentalState";
import { trustState } from "@/lib/runtime/projections/trustState";
import { relationshipState } from "@/lib/runtime/projections/relationshipState";
import { narrativeState } from "@/lib/runtime/projections/narrativeState";
import { lifeContextState } from "@/lib/runtime/projections/lifeContextState";
import { injuryRecoveryState } from "@/lib/runtime/projections/injuryRecoveryState";

function useRows(athleteId: string) {
  const q = useAsbTimeline({ athleteId });
  return q.data?.rows;
}

export function useConversationMemory(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => conversationMemoryState(rows, scope), [rows, scope]);
}

export function usePsychState(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => psychState(rows, scope), [rows, scope]);
}

export function useDevelopmentalState(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => developmentalState(rows, scope), [rows, scope]);
}

export function useTrustState(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => trustState(rows, scope), [rows, scope]);
}

export function useRelationshipState(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => relationshipState(rows, scope), [rows, scope]);
}

/** RR-5 — read-only narrative continuity projection. */
export function useNarrativeState(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => narrativeState(rows, scope), [rows, scope]);
}

/** RR-8 — read-only life context projection. */
export function useLifeContextState(athleteId: string, scope: Scope) {
  const rows = useRows(athleteId);
  return useMemo(() => lifeContextState(rows, scope), [rows, scope]);
}
