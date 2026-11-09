/** Release A3: quiet Apple Health notes (shown only under the Settings switch) + owner System checks logging. */
import { logPlanCheckFailure } from "@/lib/hammer/planCheckFailures";

export type HealthNoteKind = "read" | "write";
const noteKey = (uid: string, k: HealthNoteKind) => `hm.health.note.${k}.${uid}`;
export const PERMISSION_OFF_NOTE = "Apple Health permission is off in iPhone Settings";

export function healthNote(userId: string, kind: HealthNoteKind): string | null {
  try { return localStorage.getItem(noteKey(userId, kind)); } catch { return null; }
}
export function setHealthNote(userId: string, kind: HealthNoteKind, text: string | null) {
  try { if (text) localStorage.setItem(noteKey(userId, kind), text); else localStorage.removeItem(noteKey(userId, kind)); } catch { /* ignore */ }
}

const loggedOnce = new Set<string>();
/** One System checks row per distinct problem per app session; never pushed, never shown to players. */
export async function reportHealthProblem(userId: string, kind: HealthNoteKind, note: string, detail: string) {
  setHealthNote(userId, kind, note);
  const k = `${kind}:${detail}`;
  if (loggedOnce.has(k)) return;
  loggedOnce.add(k);
  await logPlanCheckFailure("apple_health", `${kind === "read" ? "Apple Health read" : "Apple Health save"}: ${detail}`);
}

export function _resetHealthNotesForTests() { loggedOnce.clear(); }
