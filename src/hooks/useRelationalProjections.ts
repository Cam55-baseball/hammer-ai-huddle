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

export function useConversationMemory(athleteId: string, scope: Scope) {
  const { rows } = useAsbTimeline(athleteId);
  return useMemo(() => conversationMemoryState(rows, scope), [rows, scope]);
}

export function usePsychState(athleteId: string, scope: Scope) {
  const { rows } = useAsbTimeline(athleteId);
  return useMemo(() => psychState(rows, scope), [rows, scope]);
}

export function useDevelopmentalState(athleteId: string, scope: Scope) {
  const { rows } = useAsbTimeline(athleteId);
  return useMemo(() => developmentalState(rows, scope), [rows, scope]);
}

export function useTrustState(athleteId: string, scope: Scope) {
  const { rows } = useAsbTimeline(athleteId);
  return useMemo(() => trustState(rows, scope), [rows, scope]);
}
