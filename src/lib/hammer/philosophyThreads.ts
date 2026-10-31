/** Owner philosophy-tool conversations share recall_threads but never appear in a player's Ask Hammer list. */
export const PHILOSOPHY_THREAD_TITLE = "Owner philosophy conversation";
export const PLAYER_THREAD_FILTER = `title.is.null,title.neq."${PHILOSOPHY_THREAD_TITLE}"`;
export const PHILOSOPHY_MESSAGE_ENTRY = "owner-philosophy";

/** True for a saved owner philosophy-tool turn, which never shows in Ask Hammer. */
export function isPhilosophyMessage(parts: unknown): boolean {
  const p = Array.isArray(parts) ? parts[0] : null;
  return Boolean(p && typeof p === "object" && (p as { entry?: unknown }).entry === PHILOSOPHY_MESSAGE_ENTRY);
}
