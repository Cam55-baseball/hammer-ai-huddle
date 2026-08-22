/**
 * RR-6 — read-side hook for the injury continuity arc.
 *
 * Reads canonical `relational.injury.*` events off the ledger and projects
 * them with the pure `buildInjuryArcs`. Nothing is authored here except the
 * athlete's own graded recovery checkpoint, which rides the canonical
 * `emitRecoveryCheckpoint` path. Return-to-play is never authored client-side
 * by the athlete — that requires a parent or clinician (RR-6 invariant 5).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitRecoveryCheckpoint } from "@/lib/runtime/relational/injuryEmitters";
import type { InjuryCheckpointType } from "@/lib/runtime/relational/injurySchemas";
import type { InjuryParticipationStatus } from "@/lib/runtime/relational/injurySchemas";
import {
  buildInjuryArcs,
  type InjuryArc,
  type InjuryEventRow,
} from "@/lib/hammer/injury/continuity";

export function useInjuryContinuity(userId: string | null | undefined) {
  return useQuery<InjuryArc[]>({
    queryKey: ["injury-continuity", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asb_events")
        .select("event_id, topic_id, occurred_at, actor_role, payload")
        .eq("athlete_id", userId as string)
        .like("topic_id", "relational.injury.%")
        .order("occurred_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return buildInjuryArcs((data ?? []) as unknown as InjuryEventRow[]);
    },
  });
}

export interface LogCheckpointInput {
  userId: string;
  bodyRegion: string;
  checkpointType: InjuryCheckpointType;
  participationStatus: InjuryParticipationStatus;
  recoveryFocus?: string;
  originEventId: string;
}

export function useLogRecoveryCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LogCheckpointInput) => {
      const occurredAt = new Date().toISOString();
      return emitRecoveryCheckpoint(
        {
          athleteId: input.userId,
          actorId: input.userId,
          actorRole: "athlete",
          occurredAt,
        },
        {
          visibility_scope: "self",
          authority: "self",
          confidence: 1.0,
          missingness: { fields: [], reason: "not_observed" },
          lineage_parent_ids: [input.originEventId],
          body_region: input.bodyRegion,
          checkpoint_type: input.checkpointType,
          participation_status: input.participationStatus,
          ...(input.recoveryFocus ? { recovery_focus: input.recoveryFocus } : {}),
        } as never,
        { safeguardingLockdown: false, isMinor: false },
      );
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["injury-continuity", vars.userId] });
      qc.invalidateQueries({ queryKey: ["hammer-state"] });
    },
  });
}
