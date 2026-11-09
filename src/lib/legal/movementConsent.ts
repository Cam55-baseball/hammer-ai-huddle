/**
 * Movement-data (pose / camera measurement) consent — Release 0, switch movement_consent_v1.
 * The words are the lawyer-approved text supplied by the owner (Nov 9, 2026), word for word.
 * Never edit them here without a new approved text; bump the version whenever the approved
 * words change (people then agree again).
 */
export const MOVEMENT_CONSENT_VERSION = "movement-v1";
export const MOVEMENT_CONSENT_TEXT: string | null =
  "Movement measurements. When you record inside the Hammers app, we use your camera to measure your movement, such as jump height, joint angles, sprint times and ground-contact times. We save these measurements to your training record to track your progress and personalize your plan. We don't sell them, and we only share them with the coaches and organizations you're connected to. Athletes under 18 need a parent or guardian to agree first. You can turn this off anytime in Settings and ask us to delete your measurement history.";

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
