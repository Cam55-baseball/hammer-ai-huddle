/**
 * Wave 2 — Override authority wrapper.
 *
 * Wraps emitRuntimeEvent for override-class topics. Rejects emission if
 * the caller's role lacks the override capability and stamps actor_role
 * into the payload for downstream lineage.
 */
import { emitRuntimeEvent, type RuntimeEmitInput } from "@/lib/runtime/emitRuntimeEvent";
import { can, type AppRole } from "./roleMatrix";

const OVERRIDE_TOPICS = new Set([
  "prescription.override.requested",
  "session.block.modified",
  "session.block.skipped",
  "session.block.substituted",
]);

export interface AuthorizedEmitInput extends RuntimeEmitInput {
  /** The caller's effective role at emission time. */
  callerRole: AppRole | null;
}

export async function emitAuthorizedRuntimeEvent(
  input: AuthorizedEmitInput,
): Promise<string | null> {
  if (OVERRIDE_TOPICS.has(input.topic) && !can(input.callerRole, "override")) {
    console.warn("[auth.gov] override_denied", {
      topic: input.topic,
      role: input.callerRole,
    });
    return null;
  }
  return emitRuntimeEvent({
    ...input,
    payload: {
      ...input.payload,
      caller_role: input.callerRole,
    },
  });
}
