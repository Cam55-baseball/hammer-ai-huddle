/**
 * Shared per-tab unique identifier.
 * Used by all BroadcastChannel listeners to filter out same-tab echoes.
 * Must be a single shared ID so hooks within the same tab recognize each other's messages.
 */
export const TAB_ID = crypto.randomUUID();
