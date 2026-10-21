import { EQUIPMENT_VOCABULARY } from "../hammer/context/equipmentVocabulary";
import { normalizeSwapEquipment, type SwapAvailability } from "./universalSwapCandidates";

export type SwapMemoryScope = "today" | "always";
export interface SwapConversation {
  /** This draft belongs to one account, prescription and visit; it is never persistent truth. */
  ownerId: string;
  prescriptionId: string;
  planDate: string;
  step: "missing" | "available" | "scope" | "ready";
  have: string[];
  lacks: string[];
  scope: SwapMemoryScope | null;
}

const tokens = (values: readonly string[]) => [...new Set(values.map(normalizeSwapEquipment))];
const known = new Set(EQUIPMENT_VOCABULARY.map(value => value.token));

export function startSwapConversation(ownerId: string, prescriptionId: string, planDate: string): SwapConversation {
  if (!ownerId.trim() || !prescriptionId.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(planDate) ||
      new Date(`${planDate}T12:00:00Z`).toISOString().slice(0, 10) !== planDate) {
    throw new Error("Reload your plan before choosing a swap.");
  }
  return { ownerId, prescriptionId, planDate, step: "missing", have: [], lacks: [], scope: null };
}

/** Structured confirmed answers, not a model's guesses or the remembered inventory. */
export function answerSwapConversation(draft: SwapConversation, answer:
  { step: "missing" | "available"; items: readonly string[] } |
  { step: "scope"; scope: SwapMemoryScope }): SwapConversation {
  if (answer.step !== draft.step) throw new Error("That swap question changed. Start again.");
  if (answer.step === "scope") {
    if (answer.scope !== "today" && answer.scope !== "always") throw new Error("Choose just today or always.");
    return { ...draft, step: "ready", scope: answer.scope };
  }
  const items = tokens(answer.items);
  if (items.some(item => !item || item.length > 80) || items.length > 40) {
    throw new Error("Check the equipment names before continuing.");
  }
  if (answer.step === "missing") {
    if (!items.length) throw new Error("Choose what is missing today.");
    return { ...draft, step: "available", lacks: items };
  }
  if (items.some(item => draft.lacks.includes(item))) throw new Error("An item cannot be available and missing today.");
  return { ...draft, step: "scope", have: items };
}

export function confirmedSwapAvailability(draft: SwapConversation): SwapAvailability {
  if (draft.step !== "ready" || !draft.scope) throw new Error("Finish the three swap questions first.");
  const have = tokens(draft.have), lacks = tokens(draft.lacks);
  if (!lacks.length || [...have, ...lacks].some(item => !item || item.length > 80) || have.length > 40 || lacks.length > 40 ||
      have.some(item => lacks.includes(item))) throw new Error("Check your availability answers before saving.");
  return { have, lacks, confirmed: true };
}

/** Canonical inventory patch for the future atomic server boundary. No write or success claim here.
 * Remembered tokens remain starting memory, never confirmation of space/partner/safety today.
 * Missing items remove only themselves; unrelated durable facts survive.
 */
export function swapEquipmentMemory(draft: SwapConversation, baseline: readonly string[]) {
  confirmedSwapAvailability(draft);
  const unsupported = [...draft.have, ...draft.lacks].filter(item => !known.has(item));
  // A partner or a measured runway can be a confirmed catalog requirement without being
  // an inventory token. Never silently pretend those facts were saved by the gear RPC.
  if (unsupported.length) throw new Error("Some availability answers need a checked memory field before they can be saved.");
  const inventory = new Set(tokens(baseline));
  for (const item of draft.lacks) inventory.delete(item);
  for (const item of draft.have) inventory.add(item);
  return { scope: draft.scope === "today" ? "session" as const : "persistent" as const,
    equipment: [...inventory].sort(), source: "prescription_swap" as const };
}

export function requireSwapVisit(draft: SwapConversation, ownerId: string, prescriptionId: string, planDate: string) {
  if (draft.ownerId !== ownerId || draft.prescriptionId !== prescriptionId || draft.planDate !== planDate) {
    throw new Error("This swap belongs to another plan visit. Start again.");
  }
}