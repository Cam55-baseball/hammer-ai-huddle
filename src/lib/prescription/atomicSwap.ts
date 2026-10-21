import { recordedSwapDose, type SwapDose } from "./sameDoseSwap";
import { confirmedSwapAvailability, requireSwapVisit, type SwapConversation } from "./swapConversation";
import { requireSwapSavedContext, unchangedSwapContext, type SwapSavedContext } from "./swapSnapshot";

export interface AtomicSwapSnapshot extends SwapDose, SwapSavedContext {
  id: string;
  user_id: string;
  plan_date: string;
  movement_slug: string;
  updated_at: string;
  status: string;
}
export interface AtomicSwapRequest {
  prescriptionId: string;
  planDate: string;
  expected: AtomicSwapSnapshot;
  candidateSlug: string;
  availability: ReturnType<typeof confirmedSwapAvailability>;
  memoryScope: "today" | "always";
  requestId: string;
}
export interface AtomicSwapResult {
  state: "saved" | "refused";
  requestId: string;
  row: AtomicSwapSnapshot | null;
  /** Only an authoritative transaction may assert this. Not a second gear write. */
  memorySaved: boolean;
  reason: string;
}
export type AtomicSwapTransport = (request: AtomicSwapRequest) => Promise<AtomicSwapResult>;

/** Staged boundary: deliberately no table update, separate inventory write or legacy fallback.
 * Wire one certified server transaction only after it is authorized, installed and proved.
 */
export async function commitAtomicSwap(draft: SwapConversation, expected: AtomicSwapSnapshot,
  candidateSlug: string, requestId: string, transport: AtomicSwapTransport): Promise<AtomicSwapResult> {
  requireSwapVisit(draft, expected.user_id, expected.id, expected.plan_date);
  const dose = recordedSwapDose(expected);
  requireSwapSavedContext(expected);
  if (!candidateSlug.trim() || candidateSlug === expected.movement_slug || !requestId.trim() || !expected.updated_at ||
      !["planned", "pending"].includes(expected.status)) throw new Error("Your session is unchanged. Reload your plan.");
  const availability = confirmedSwapAvailability(draft);
  if (!draft.scope) throw new Error("Choose just today or always.");
  const result = await transport({ prescriptionId: expected.id, planDate: expected.plan_date,
    expected: structuredClone(expected), candidateSlug, availability, memoryScope: draft.scope, requestId });
  const saved = result.row;
  if (result.state !== "saved" || result.requestId !== requestId || !result.memorySaved || !result.reason.trim() ||
      !saved || saved.id !== expected.id || saved.user_id !== expected.user_id || saved.plan_date !== expected.plan_date ||
      saved.movement_slug !== candidateSlug || saved.status !== expected.status || !saved.updated_at) {
    throw new Error("I couldn't confirm the swap and memory together. Reload your plan before trying again.");
  }
  const returnedDose = recordedSwapDose(saved);
  if (Object.keys(dose).some(field => dose[field as keyof SwapDose] !== returnedDose[field as keyof SwapDose]) ||
      !unchangedSwapContext(expected, saved)) {
    throw new Error("The returned swap changed the work. Reload your plan; don't start this replacement.");
  }
  return result;
}