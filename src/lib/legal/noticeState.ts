/** The update notice is still needed only while the PRIVACY policy's newest version has no saved acknowledgment. */
export function noticeStillNeeded(
  latest: Record<string, number>,
  status: Record<string, { document_version: number; choice: string }>,
  slugs: readonly string[],
): boolean {
  const lead = slugs[0];
  const v = latest[lead];
  if (!v) return false;
  const st = status[lead];
  return !st || st.choice !== "accepted" || st.document_version < v;
}
