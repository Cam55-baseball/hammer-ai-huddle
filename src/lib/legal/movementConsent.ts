/**
 * Movement-data (pose / camera measurement) consent — Release 0, switch movement_consent_v1.
 * The words MUST be the lawyer-approved text, pasted exactly. Until the owner supplies them this
 * stays null: the consent step cannot be shown or accepted, and the switch must stay off.
 * Bump the version whenever the approved words change (people then agree again).
 */
export const MOVEMENT_CONSENT_VERSION = "movement-v1";
export const MOVEMENT_CONSENT_TEXT: string | null = null;

export type MovementConsentStatus = "none" | "active" | "pending_parent" | "declined" | "revoked";

export async function sha256HexOfText(text: string): Promise<string> {
  const d = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Plain words for each state (14-year-old wording). */
export function movementConsentLabel(s: MovementConsentStatus): string {
  switch (s) {
    case "active": return "You said yes. The app can save camera measurements.";
    case "pending_parent": return "Waiting for your parent to say yes.";
    case "declined": return "Your parent said no. Camera measurements stay off.";
    case "revoked": return "You turned this off. Camera measurements stay off.";
    default: return "Not answered yet.";
  }
}

/** A camera measurement may be taken only with an active consent. */
export function mayMeasureMovement(s: MovementConsentStatus): boolean {
  return s === "active";
}
