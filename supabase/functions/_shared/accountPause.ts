// Paused accounts (under 13, pending a parent or guardian) get no uploads,
// no AI analysis and no new data. Fail-open on a read error would collect
// data from a child, so a read error counts as paused.
// deno-lint-ignore-file no-explicit-any
export async function isAccountPaused(admin: any, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await admin.from("profiles").select("account_paused_at").eq("id", userId).maybeSingle();
    if (error) return true;
    return !!data?.account_paused_at;
  } catch {
    return true;
  }
}

export function pausedResponse(cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: "account_paused", message: "This account is paused until a parent or guardian sets it up." }), {
    status: 403, headers: { ...cors, "Content-Type": "application/json" },
  });
}
