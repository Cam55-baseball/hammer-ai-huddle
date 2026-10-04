/**
 * A video save that the server refuses must never be silent and never
 * mislabelled. Turns a database error into a true message with a reference
 * code, and leaves a structured diagnostic line in the console so the
 * failure can be traced from the reference alone.
 */
type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null } | null | undefined;

export function describeVideoSaveFailure(err: DbError, context: { surface: string; module?: string; userId?: string }) {
  const ref = `VS-${Date.now().toString(36).toUpperCase()}`;
  const code = err?.code ?? "unknown";
  const raw = err?.message ?? String(err ?? "");
  const sessionGone = code === "PGRST301" || code === "PGRST303" || /jwt|expired|not authenticated/i.test(raw);
  const refused = code === "42501" || /permission denied|row-level security/i.test(raw);

  const message = sessionGone
    ? "You've been signed out. Sign in again and your video will still be here."
    : refused
      ? `Your clip uploaded, but our server refused to save it to your account. This is a problem on our side, not your clip — please tell support and quote ${ref}.`
      : `We couldn't save this video to your account. Try again in a moment; if it keeps failing, tell support and quote ${ref}.`;

  console.error("[video-save-failure]", JSON.stringify({
    ref, surface: context.surface, module: context.module ?? null, user_id: context.userId ?? null,
    db_code: code, db_message: raw, db_details: err?.details ?? null, db_hint: err?.hint ?? null,
    at: new Date().toISOString(),
  }));

  return { ref, message, kind: sessionGone ? "session" : refused ? "refused" : "other" } as const;
}
